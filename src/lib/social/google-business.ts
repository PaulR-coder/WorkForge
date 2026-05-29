const GBP_API = 'https://mybusiness.googleapis.com/v4'

export async function publishToGoogleBusiness(
  accessToken: string,
  locationName: string,
  text: string,
  imageBuffer?: Buffer
): Promise<{ success: true; postId: string } | { success: false; error: string }> {
  try {
    const body: Record<string, unknown> = {
      languageCode: 'en',
      summary: text,
      topicType: 'STANDARD',
    }

    if (imageBuffer) {
      const b64 = imageBuffer.toString('base64')
      body.media = [{ mediaFormat: 'PHOTO', sourceUrl: `data:image/jpeg;base64,${b64}` }]
    }

    const res = await fetch(`${GBP_API}/${locationName}/localPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json() as { name?: string; error?: { message: string } }
    if (!res.ok || !data.name) {
      return { success: false, error: data.error?.message ?? 'Google Business post failed' }
    }

    return { success: true, postId: data.name }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
