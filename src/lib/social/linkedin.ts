const LI_API = 'https://api.linkedin.com/v2'

export async function publishToLinkedIn(
  accessToken: string,
  organizationId: string,
  text: string,
  imageBuffer?: Buffer
): Promise<{ success: true; postId: string } | { success: false; error: string }> {
  try {
    let imageAsset: string | undefined

    if (imageBuffer) {
      // Register upload
      const registerRes = await fetch(`${LI_API}/assets?action=registerUpload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: organizationId,
            serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
          },
        }),
      })
      const registerData = await registerRes.json() as {
        value?: { uploadMechanism?: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'?: { uploadUrl?: string } }; asset?: string }
      }
      const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
      imageAsset = registerData.value?.asset

      if (!uploadUrl || !imageAsset) {
        return { success: false, error: 'LinkedIn asset registration failed' }
      }

      // Upload binary
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg' },
        body: new Uint8Array(imageBuffer),
      })
      if (!uploadRes.ok) return { success: false, error: 'LinkedIn image upload failed' }
    }

    const body: Record<string, unknown> = {
      author: organizationId,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: imageAsset ? 'IMAGE' : 'NONE',
          ...(imageAsset ? {
            media: [{ status: 'READY', media: imageAsset }],
          } : {}),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }

    const res = await fetch(`${LI_API}/ugcPosts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(body),
    })

    const postId = res.headers.get('x-restli-id')
    if (!res.ok || !postId) {
      const errData = await res.json().catch(() => ({})) as { message?: string }
      return { success: false, error: errData.message ?? 'LinkedIn post failed' }
    }

    return { success: true, postId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
