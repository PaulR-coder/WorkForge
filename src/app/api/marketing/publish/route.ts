import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { decryptToken, encryptToken } from '@/lib/social/crypto'
import { publishToFacebook, publishToInstagram } from '@/lib/social/meta'
import { publishToLinkedIn } from '@/lib/social/linkedin'
import { publishToGoogleBusiness } from '@/lib/social/google-business'
import { z } from 'zod'

const PublishSchema = z.object({
  copy: z.record(z.string(), z.unknown()),
  tool: z.string().min(1),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  connectionIds: z.array(z.string()).min(1),
})

function formatCopyForPlatform(copy: Record<string, unknown>, tool: string): string {
  switch (tool) {
    case 'social_post': {
      const caption = String(copy.caption ?? '')
      const hashtags = Array.isArray(copy.hashtags)
        ? copy.hashtags.map((h: unknown) => `#${String(h)}`).join(' ')
        : ''
      return hashtags ? `${caption}\n\n${hashtags}` : caption
    }
    case 'facebook_ad':
      return String(copy.primaryText ?? '')
    case 'service_description': {
      const headline = String(copy.pageHeadline ?? '')
      const body = String(copy.bodyCopy ?? '')
      return `${headline}\n\n${body.slice(0, 300)}`
    }
    default:
      return ''
  }
}

async function maybeRefreshGoogleToken(connection: {
  id: string
  accessToken: string
  refreshToken: string | null
  tokenExpiry: Date | null
}): Promise<string> {
  const accessToken = decryptToken(connection.accessToken)
  if (!connection.refreshToken) return accessToken

  const fiveMinutes = 5 * 60 * 1000
  const nearExpiry = connection.tokenExpiry && connection.tokenExpiry.getTime() - Date.now() < fiveMinutes

  if (!nearExpiry) return accessToken

  const refreshToken = decryptToken(connection.refreshToken)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  })
  const data = await res.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) return accessToken

  await prisma.socialConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptToken(data.access_token),
      tokenExpiry: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : connection.tokenExpiry,
    },
  })

  return data.access_token
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!session.tenantId) return Response.json({ error: 'No tenant' }, { status: 403 })

  const raw = await request.json().catch(() => null)
  if (!raw) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const pr = PublishSchema.safeParse(raw)
  if (!pr.success) return Response.json({ error: pr.error.issues[0].message }, { status: 400 })
  const { copy, tool, imageUrl, imageBase64, connectionIds } = pr.data

  // Fetch and verify all connections belong to this tenant
  const connections = await prisma.socialConnection.findMany({
    where: { id: { in: connectionIds }, tenantId: session.tenantId },
  })

  const text = formatCopyForPlatform(copy as Record<string, unknown>, tool)

  // Fetch image buffer once (if DALL-E URL)
  let imageBuffer: Buffer | undefined
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl)
      if (imgRes.ok) imageBuffer = Buffer.from(await imgRes.arrayBuffer())
    } catch { /* proceed without image */ }
  } else if (imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    imageBuffer = Buffer.from(base64Data, 'base64')
  }

  // Publish to all requested connections (never short-circuit on failure)
  const results = await Promise.all(
    connections.map(async (conn) => {
      try {
        let result: { success: true; postId: string } | { success: false; error: string }
        const token = decryptToken(conn.accessToken)

        if (conn.platform === 'facebook') {
          result = await publishToFacebook(token, conn.accountId, text, imageBuffer)
        } else if (conn.platform === 'instagram') {
          if (!imageUrl && !imageBase64) {
            result = { success: false, error: 'Instagram requires an image' }
          } else {
            const igImageUrl = imageUrl ?? `data:image/jpeg;base64,${imageBase64?.replace(/^data:image\/\w+;base64,/, '') ?? ''}`
            result = await publishToInstagram(token, conn.accountId, text, igImageUrl)
          }
        } else if (conn.platform === 'linkedin') {
          result = await publishToLinkedIn(token, conn.accountId, text, imageBuffer)
        } else if (conn.platform === 'google_business') {
          const freshToken = await maybeRefreshGoogleToken(conn)
          result = await publishToGoogleBusiness(freshToken, conn.accountId, text, imageBuffer)
        } else {
          result = { success: false, error: `Unknown platform: ${conn.platform}` }
        }

        return {
          connectionId: conn.id,
          platform: conn.platform,
          accountName: conn.accountName,
          ...result,
        }
      } catch (err) {
        return {
          connectionId: conn.id,
          platform: conn.platform,
          accountName: conn.accountName,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    })
  )

  return Response.json({ results })
}
