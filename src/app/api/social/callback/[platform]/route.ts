import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/social/crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const APP_URL = process.env.APP_URL!

async function exchangeCode(platform: string, code: string): Promise<{
  accessToken: string
  refreshToken?: string
  tokenExpiry?: Date
}> {
  const redirectUri = `${APP_URL}/api/social/callback/${platform}`

  switch (platform) {
    case 'facebook': {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?` + new URLSearchParams({
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          redirect_uri: redirectUri,
          code,
        })
      )
      const data = await res.json() as { access_token?: string; error?: { message: string } }
      if (!data.access_token) throw new Error(data.error?.message ?? 'Token exchange failed')
      return { accessToken: data.access_token }
    }

    case 'linkedin': {
      const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      })
      const data = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
      if (!data.access_token) throw new Error('LinkedIn token exchange failed')
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      }
    }

    case 'google_business': {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })
      const data = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
      if (!data.access_token) throw new Error('Google token exchange failed')
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      }
    }

    default:
      throw new Error(`Unknown platform: ${platform}`)
  }
}

async function fetchAndStoreConnections(
  platform: string,
  tokens: { accessToken: string; refreshToken?: string; tokenExpiry?: Date },
  tenantId: string
): Promise<void> {
  const { accessToken, refreshToken, tokenExpiry } = tokens

  if (platform === 'facebook') {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
    )
    const pagesData = await pagesRes.json() as { data?: Array<{ id: string; name: string; access_token: string }> }
    const pages = pagesData.data ?? []

    for (const page of pages) {
      await prisma.socialConnection.upsert({
        where: { tenantId_platform_accountId: { tenantId, platform: 'facebook', accountId: page.id } },
        create: {
          tenantId,
          platform: 'facebook',
          accountId: page.id,
          accountName: page.name,
          accessToken: encryptToken(page.access_token),
          tokenExpiry,
        },
        update: {
          accountName: page.name,
          accessToken: encryptToken(page.access_token),
          tokenExpiry,
        },
      })

      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      )
      const igData = await igRes.json() as { instagram_business_account?: { id: string } }
      if (igData.instagram_business_account?.id) {
        const igId = igData.instagram_business_account.id
        const igInfoRes = await fetch(
          `https://graph.facebook.com/v19.0/${igId}?fields=name,username&access_token=${page.access_token}`
        )
        const igInfo = await igInfoRes.json() as { name?: string; username?: string }
        const igName = igInfo.name ?? igInfo.username ?? `Instagram (${page.name})`

        await prisma.socialConnection.upsert({
          where: { tenantId_platform_accountId: { tenantId, platform: 'instagram', accountId: igId } },
          create: {
            tenantId,
            platform: 'instagram',
            accountId: igId,
            accountName: igName,
            accessToken: encryptToken(page.access_token),
            tokenExpiry,
          },
          update: {
            accountName: igName,
            accessToken: encryptToken(page.access_token),
            tokenExpiry,
          },
        })
      }
    }
    return
  }

  if (platform === 'linkedin') {
    const orgsRes = await fetch('https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,id)))', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const orgsData = await orgsRes.json() as { elements?: Array<{ 'organization~'?: { id: string; localizedName: string } }> }
    const orgs = orgsData.elements ?? []

    for (const org of orgs) {
      const orgInfo = org['organization~']
      if (!orgInfo) continue
      const orgUrn = `urn:li:organization:${orgInfo.id}`

      await prisma.socialConnection.upsert({
        where: { tenantId_platform_accountId: { tenantId, platform: 'linkedin', accountId: orgUrn } },
        create: {
          tenantId,
          platform: 'linkedin',
          accountId: orgUrn,
          accountName: orgInfo.localizedName,
          accessToken: encryptToken(accessToken),
          refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
          tokenExpiry,
        },
        update: {
          accountName: orgInfo.localizedName,
          accessToken: encryptToken(accessToken),
          refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
          tokenExpiry,
        },
      })
    }
    return
  }

  if (platform === 'google_business') {
    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const accountsData = await accountsRes.json() as { accounts?: Array<{ name: string }> }
    const accounts = accountsData.accounts ?? []

    for (const account of accounts) {
      const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const locData = await locRes.json() as { locations?: Array<{ name: string; title: string }> }
      const locations = locData.locations ?? []

      for (const loc of locations) {
        await prisma.socialConnection.upsert({
          where: { tenantId_platform_accountId: { tenantId, platform: 'google_business', accountId: loc.name } },
          create: {
            tenantId,
            platform: 'google_business',
            accountId: loc.name,
            accountName: loc.title,
            accessToken: encryptToken(accessToken),
            refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
            tokenExpiry,
          },
          update: {
            accountName: loc.title,
            accessToken: encryptToken(accessToken),
            refreshToken: refreshToken ? encryptToken(refreshToken) : undefined,
            tokenExpiry,
          },
        })
      }
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await getSession()
  if (!session?.tenantId) redirect('/login')

  const { platform } = await params
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) redirect('/settings/social?error=oauth_cancelled')

  const cookieStore = await cookies()
  const storedState = cookieStore.get('oauth_state')?.value
  cookieStore.delete('oauth_state')

  if (!state || state !== storedState) redirect('/settings/social?error=oauth_state_mismatch')
  if (!code) redirect('/settings/social?error=no_code')

  try {
    const tokens = await exchangeCode(platform, code)
    await fetchAndStoreConnections(platform, tokens, session.tenantId)
    redirect('/settings/social?connected=true')
  } catch {
    redirect('/settings/social?error=oauth_failed')
  }
}
