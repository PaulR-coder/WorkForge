# Marketing Wizard Design Spec

## Goal

Replace the current "type something, get a text blob" marketing tab with a 3-step wizard that generates structured copy variations, generates an AI image, and publishes directly to Facebook, Instagram, LinkedIn, and Google Business Profile — desktop only.

## What We Are Not Building

- Paid ad campaign creation (Google Ads API, Facebook Ads API) — out of scope, future phase
- Post scheduling / queue — out of scope
- Post history / library — out of scope (can be added later, schema supports it)
- Mobile layout — desktop only by design

---

## Architecture

### New database models

```prisma
model SocialConnection {
  id           String   @id @default(cuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  platform     String   // "facebook" | "instagram" | "linkedin" | "google_business"
  accountId    String   // platform's page/account ID
  accountName  String   // display name shown in UI
  accessToken  String   // encrypted at rest
  refreshToken String?  // encrypted at rest (LinkedIn, Google need refresh tokens)
  tokenExpiry  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([tenantId, platform, accountId])
}
```

Add `socialConnections SocialConnection[]` relation to `Tenant`.

Note: `accessToken` and `refreshToken` are stored AES-256 encrypted using `SOCIAL_TOKEN_SECRET` env var. Encrypt on write, decrypt on read in `src/lib/social/crypto.ts`.

### New environment variables

```
OPENAI_API_KEY            # DALL-E 3 image generation
META_APP_ID               # Facebook/Instagram OAuth
META_APP_SECRET
LINKEDIN_CLIENT_ID        # LinkedIn OAuth
LINKEDIN_CLIENT_SECRET
GOOGLE_CLIENT_ID          # Google Business Profile OAuth
GOOGLE_CLIENT_SECRET
SOCIAL_TOKEN_SECRET       # 32-byte hex key for token encryption
APP_URL                   # already exists — used for OAuth redirect URIs
```

### File structure

**New files:**
- `src/app/(app)/marketing/steps/CopyStep.tsx`
- `src/app/(app)/marketing/steps/ImageStep.tsx`
- `src/app/(app)/marketing/steps/PublishStep.tsx`
- `src/app/api/marketing/image/route.ts`
- `src/app/api/marketing/publish/route.ts`
- `src/app/api/social/auth/[platform]/route.ts`
- `src/app/api/social/callback/[platform]/route.ts`
- `src/app/api/social/connections/route.ts`
- `src/lib/social/crypto.ts`
- `src/lib/social/meta.ts`
- `src/lib/social/linkedin.ts`
- `src/lib/social/google-business.ts`

**Modified files:**
- `src/app/(app)/marketing/MarketingClient.tsx` — full rewrite
- `src/app/api/marketing/generate/route.ts` — update to return 3 structured JSON variations
- `prisma/schema.prisma` — add SocialConnection model
- `src/app/(app)/settings/SettingsClient.tsx` (or equivalent) — add Social Accounts section

---

## Step 1 — Copy Generation

### UI

Two-column layout (sidebar + main). Sidebar is the existing tool type selector (unchanged). Main area:

1. Form fields (same as current, 2-column grid)
2. "Generate 3 Variations" button
3. Three stacked variation cards appear after generation

**Variation card states:**

- **Collapsed (not selected):** Single-line preview of the first headline/subject. "Use this" button on the right.
- **Expanded (selected, only one at a time):** Full structured sections with character count badge on each field. Amber border. "✓ Using this" badge.

**Structured sections by tool type:**

| Tool | Sections | Char limits |
|------|----------|-------------|
| google_ad | Headline 1, Headline 2, Headline 3, Description 1, Description 2 | Headlines: 30, Descriptions: 90 |
| facebook_ad | Primary Text, Headline, Link Description | Primary: 125, Headline: 40, Description: 30 |
| social_post | Caption, Hashtags | Caption limit uses the selected platform from the Platform field in Step 1: Instagram → 2200, Facebook → 63206, LinkedIn → 700, Twitter/X → 280 |
| email_campaign | Subject Line, Preview Text, Body | Subject: 60 recommended |
| service_description | Page Headline, Body Copy, Meta Description | Meta: 160 |
| review_response | Response | None |

Character count badge colors: amber if within 5 chars of limit, green if comfortably under, red if over.

Each section has a pencil icon. Clicking it makes the field an editable `<textarea>` or `<input>`. Clicking away saves.

"Next: Generate Image →" button only enabled once a variation is selected.

### API — `POST /api/marketing/generate`

Rewrite to return structured JSON instead of streaming text. Single call to Claude Sonnet with a structured prompt.

**Request:**
```typescript
{ tool: ToolId, inputs: Record<string, string> }
```

**Response:**
```typescript
{ variations: Variation[] }  // always 3
```

Where `Variation` is tool-specific:
```typescript
// google_ad
{ headline1: string, headline2: string, headline3: string, description1: string, description2: string }
// facebook_ad
{ primaryText: string, headline: string, linkDescription: string }
// social_post
{ caption: string, hashtags: string[] }
// email_campaign
{ subjectLine: string, previewText: string, body: string }
// service_description
{ pageHeadline: string, bodyCopy: string, metaDescription: string }
// review_response
{ response: string }
```

**Prompt pattern (google_ad example):**
```
You are a Google Ads copywriter for field service businesses.

Business: {businessName}
Service: {service}
Location: {location}
CTA: {callToAction}

Return ONLY a JSON array of exactly 3 ad variations. No markdown. No explanation.
Schema:
[{"headline1":"","headline2":"","headline3":"","description1":"","description2":""},...]

Rules:
- headline1/2/3: max 30 characters each (count precisely)
- description1/2: max 90 characters each (count precisely)  
- Each variation must be meaningfully different in angle/tone
- Use location naturally in at least one headline per variation
- Strong CTAs: "Call Today", "Free Quote", "Same-Day Service"
```

Use `claude-sonnet-4-6`, `max_tokens: 1024`. Parse response as JSON. If parsing fails, retry once with a stricter prompt. If it fails again, return 500.

---

## Step 2 — Image Generation

### UI

Two-column layout:
- **Left:** Auto-generated prompt (editable textarea), style picker (4 options), Generate button + Back button
- **Right:** Image preview area (shows generated image or placeholder), "Use this image" button, "Skip — post text only" link

**Auto-prompt generation:** On entering Step 2, fire a separate API call to generate a suggested DALL-E prompt based on the copy context. Show a spinner then populate the textarea. User can edit freely before generating the image.

**Style options:** Photo Realistic, Bold Graphic, Illustration, Upload My Own

"Upload My Own" opens a file picker (accept: `image/*`). The selected image is stored as a base64 data URL in component state — no upload to server until Publish.

**Generated image:** Displayed at full width in the right panel. The image URL from DALL-E is kept in state and sent to the Publish step.

### API — `POST /api/marketing/image/generate`

```typescript
// Request
{ prompt: string, style: 'photo' | 'graphic' | 'illustration' }

// Response
{ imageUrl: string }  // DALL-E hosted URL, valid ~1 hour
```

Style maps to DALL-E prompt suffix:
- `photo` → append "Professional photo, photorealistic, high quality commercial photography"
- `graphic` → append "Bold vector graphic, vibrant colors, flat design, marketing poster style"
- `illustration` → append "Clean digital illustration, friendly and professional, modern style"

Use `gpt-image-1` model, `size: "1024x1024"`, `quality: "standard"`.

### API — `POST /api/marketing/image/prompt`

Separate lightweight endpoint called on Step 2 entry.

```typescript
// Request
{ tool: ToolId, inputs: Record<string, string>, selectedVariation: Variation }

// Response  
{ prompt: string }
```

Uses Claude Haiku to generate a one-paragraph DALL-E prompt from the business context. Fast, cheap, non-critical (if it fails, textarea starts empty).

---

## Step 3 — Publish

### UI

Two-column layout:
- **Left:** Post preview (image + copy formatted as a social card). Two download buttons: "Download Image" (saves the PNG) and "Copy Text" (copies the formatted copy to clipboard).
- **Right:** List of all 4 platform slots. Connected ones show account name + checkbox (pre-checked). Disconnected ones show "Connect" button that opens the OAuth flow in a new tab. "Publish Now to N platforms" button at bottom (N = count of checked platforms, disabled if 0 selected).

After clicking Publish:
- Button shows spinner
- Each platform shows a status: ✓ Posted / ✗ Failed (with error message)
- "Start Over" button to return to Step 1

### API — `POST /api/marketing/publish`

```typescript
// Request
{
  copy: Variation,
  tool: ToolId,
  imageUrl?: string,      // DALL-E URL or null if text-only
  imageBase64?: string,   // if user uploaded their own
  connectionIds: string[] // SocialConnection IDs to publish to
}

// Response
{
  results: Array<{
    connectionId: string
    platform: string
    accountName: string
    success: boolean
    error?: string
    postUrl?: string  // URL to the published post if platform returns one
  }>
}
```

For each connectionId:
1. Decrypt access token from DB
2. If imageUrl provided, download it server-side (`fetch(imageUrl)` → buffer)
3. Call platform-specific publish function from `src/lib/social/`
4. Collect result

All platforms are attempted regardless of individual failures. Response always 200 with per-platform results.

**Copy formatting for social post:**
- `google_ad`: Not published to social — this tool type is disabled on the platform selector in Step 3 (show tooltip: "Google Ads are published through the Google Ads dashboard")
- `facebook_ad`: Use `primaryText` as caption
- `social_post`: Use `caption` + formatted hashtags
- `email_campaign`: Not publishable to social — disabled
- `service_description`: Use `pageHeadline` + first 300 chars of `bodyCopy`
- `review_response`: Not publishable to social — disabled

Non-publishable tools: Step 3 shows a message instead of platform selector: "This content type is for download only — copy it into your ad platform." Still shows the download button.

---

## Social OAuth

### OAuth flow

`GET /api/social/auth/[platform]`

Redirects the browser to the platform's OAuth authorization URL. Stores `state` param in a short-lived cookie (5 min) for CSRF validation.

Platform redirect URIs (registered in each developer portal):
- `{APP_URL}/api/social/callback/facebook`
- `{APP_URL}/api/social/callback/linkedin`
- `{APP_URL}/api/social/callback/google_business`

Instagram uses the same app as Facebook (Meta).

`GET /api/social/callback/[platform]`

After user authorizes:
1. Validate `state` cookie
2. Exchange code for access token
3. Fetch user's pages/accounts for this platform
4. Encrypt and store ALL pages/locations returned as separate `SocialConnection` rows (one row per page). Users can disconnect individual ones in Settings.
5. Redirect to `/marketing` (or `/settings#social` if initiated from settings)

For **Meta**: after getting user token, call `/me/accounts` to get all Facebook Pages and their page access tokens. Instagram Business accounts are linked to Pages — call `/[page-id]?fields=instagram_business_account` for each page. Store each page as a separate `SocialConnection` row.

For **LinkedIn**: get user's organization pages via `/v2/organizationAcls`. Store refresh token (access tokens expire in 60 days, refresh tokens in 1 year). Refresh automatically before publish if token is near expiry.

For **Google Business**: get locations via `mybusiness.googleapis.com/v4/accounts/{accountId}/locations`. Store refresh token (access tokens expire in 1 hour). Always refresh before publish.

### `GET /api/social/connections`

Returns all `SocialConnection` records for the current tenant (access tokens excluded):

```typescript
Array<{ id, platform, accountId, accountName, tokenExpiry, createdAt }>
```

### `DELETE /api/social/connections/[id]`

Deletes a connection. Validates tenant ownership before deleting.

---

## Platform Publishing Functions

### `src/lib/social/meta.ts`

```typescript
export async function publishToFacebook(
  pageAccessToken: string,
  pageId: string,
  message: string,
  imageBuffer?: Buffer
): Promise<{ success: true; postId: string } | { success: false; error: string }>
```

Graph API endpoints:
- Text only: `POST /{page-id}/feed` with `{ message, access_token }`
- With image: first `POST /{page-id}/photos` with `{ source: imageBuffer, published: false }` → get `photo_id`, then `POST /{page-id}/feed` with `{ message, attached_media: [{ media_fbid: photo_id }] }`

Instagram (connected to same page):
```typescript
export async function publishToInstagram(
  pageAccessToken: string,
  igAccountId: string,
  caption: string,
  imageUrl: string  // must be a public URL — use DALL-E URL or upload first
): Promise<{ success: true; postId: string } | { success: false; error: string }>
```

Instagram requires a public image URL (not a buffer upload). Use DALL-E URL directly, or if user uploaded their own image, upload to Meta's container first.

### `src/lib/social/linkedin.ts`

```typescript
export async function publishToLinkedIn(
  accessToken: string,
  organizationId: string,
  text: string,
  imageBuffer?: Buffer
): Promise<{ success: true; postId: string } | { success: false; error: string }>
```

Uses LinkedIn's `ugcPosts` endpoint. For images, upload via LinkedIn's asset upload API first.

### `src/lib/social/google-business.ts`

```typescript
export async function publishToGoogleBusiness(
  accessToken: string,
  locationName: string,  // "accounts/{accountId}/locations/{locationId}"
  text: string,
  imageBuffer?: Buffer
): Promise<{ success: true; postId: string } | { success: false; error: string }>
```

Uses `mybusiness.googleapis.com/v4/{locationName}/localPosts`. Post type: `STANDARD`.

---

## Settings — Social Accounts Section

Add a "Social Accounts" section to the existing settings page. Shows 4 platform slots:

- **Facebook** — shows all connected pages with disconnect button each. "Connect Facebook" button.
- **Instagram** — auto-appears when a Facebook Page with linked Instagram Business is connected. No separate connect button.
- **LinkedIn** — "Connect LinkedIn" button. Shows connected org pages.
- **Google Business** — "Connect Google Business" button. Shows connected locations.

Clicking any Connect button calls `GET /api/social/auth/[platform]` which redirects.

---

## Token Security

`src/lib/social/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const KEY = Buffer.from(process.env.SOCIAL_TOKEN_SECRET!, 'hex') // 32 bytes

export function encryptToken(token: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', KEY, iv)
  return iv.toString('hex') + ':' + Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]).toString('hex')
}

export function decryptToken(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(':')
  const decipher = createDecipheriv('aes-256-cbc', KEY, Buffer.from(ivHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
}
```

---

## Error States

- **Generate fails:** Show error banner, "Try Again" button. Keep form inputs filled.
- **Image generation fails:** Show error in image panel. User can retry or skip image.
- **OAuth fails / user cancels:** Redirect back to settings with `?error=oauth_cancelled`. Show banner.
- **Publish partially fails:** Show per-platform status. Don't block the user — let them retry individual platforms or copy manually.
- **Token expired at publish time:** Attempt token refresh. If refresh fails, show "Reconnect [Platform]" link for that platform's result row.

---

## What Is Not Needed

- Post scheduling or a queue
- Analytics on published posts
- Multiple images (one AI image per post)
- Generating captions in different languages
- Any mobile layout
