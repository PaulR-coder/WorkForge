const FB_API = 'https://graph.facebook.com/v19.0'

export async function publishToFacebook(
  pageAccessToken: string,
  pageId: string,
  message: string,
  imageBuffer?: Buffer
): Promise<{ success: true; postId: string } | { success: false; error: string }> {
  try {
    if (imageBuffer) {
      // Upload photo as unpublished
      const formData = new FormData()
      formData.append('source', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg')
      formData.append('published', 'false')
      formData.append('access_token', pageAccessToken)

      const uploadRes = await fetch(`${FB_API}/${pageId}/photos`, { method: 'POST', body: formData })
      const uploadData = await uploadRes.json() as { id?: string; error?: { message: string } }
      if (!uploadRes.ok || !uploadData.id) {
        return { success: false, error: uploadData.error?.message ?? 'Photo upload failed' }
      }

      const feedRes = await fetch(`${FB_API}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          attached_media: [{ media_fbid: uploadData.id }],
          access_token: pageAccessToken,
        }),
      })
      const feedData = await feedRes.json() as { id?: string; error?: { message: string } }
      if (!feedRes.ok || !feedData.id) {
        return { success: false, error: feedData.error?.message ?? 'Post failed' }
      }
      return { success: true, postId: feedData.id }
    }

    // Text-only post
    const res = await fetch(`${FB_API}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: pageAccessToken }),
    })
    const data = await res.json() as { id?: string; error?: { message: string } }
    if (!res.ok || !data.id) {
      return { success: false, error: data.error?.message ?? 'Post failed' }
    }
    return { success: true, postId: data.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function publishToInstagram(
  pageAccessToken: string,
  igAccountId: string,
  caption: string,
  imageUrl: string
): Promise<{ success: true; postId: string } | { success: false; error: string }> {
  try {
    // Step 1: Create media container
    const containerRes = await fetch(`${FB_API}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: pageAccessToken }),
    })
    const containerData = await containerRes.json() as { id?: string; error?: { message: string } }
    if (!containerRes.ok || !containerData.id) {
      return { success: false, error: containerData.error?.message ?? 'Media container creation failed' }
    }

    // Step 2: Publish container
    const publishRes = await fetch(`${FB_API}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: pageAccessToken }),
    })
    const publishData = await publishRes.json() as { id?: string; error?: { message: string } }
    if (!publishRes.ok || !publishData.id) {
      return { success: false, error: publishData.error?.message ?? 'Media publish failed' }
    }

    return { success: true, postId: publishData.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
