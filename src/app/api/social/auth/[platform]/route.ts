import { getSession } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'

const APP_URL = process.env.APP_URL!
const META_APP_ID = process.env.META_APP_ID!
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!

function buildOAuthUrl(platform: string, state: string): string {
  const redirectUri = `${APP_URL}/api/social/callback/${platform}`

  switch (platform) {
    case 'facebook':
    case 'instagram':
      return `https://www.facebook.com/v19.0/dialog/oauth?` + new URLSearchParams({
        client_id: META_APP_ID,
        redirect_uri: `${APP_URL}/api/social/callback/facebook`,
        state,
        scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
        response_type: 'code',
      })

    case 'linkedin':
      return `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
        response_type: 'code',
        client_id: LINKEDIN_CLIENT_ID,
        redirect_uri: redirectUri,
        state,
        scope: 'r_organization_social,w_organization_social,rw_organization_admin',
      })

    case 'google_business':
      return `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        response_type: 'code',
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        state,
        scope: 'https://www.googleapis.com/auth/business.manage',
        access_type: 'offline',
        prompt: 'consent',
      })

    default:
      throw new Error(`Unknown platform: ${platform}`)
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(session.role, 'manageSettings')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { platform } = await params
  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
  })

  try {
    const url = buildOAuthUrl(platform, state)
    return Response.redirect(url)
  } catch {
    redirect('/settings/social?error=unknown_platform')
  }
}
