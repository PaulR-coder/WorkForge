import { publishToFacebook, publishToInstagram } from '@/lib/social/meta'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => mockFetch.mockReset())

describe('publishToFacebook', () => {
  it('returns success with postId on text-only post', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'post_123' }),
    })

    const result = await publishToFacebook('page-token', 'page-123', 'Hello world!')
    expect(result).toEqual({ success: true, postId: 'post_123' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v19.0/page-123/feed',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('returns failure on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Token expired' } }),
    })

    const result = await publishToFacebook('bad-token', 'page-123', 'Hello')
    expect(result).toEqual({ success: false, error: 'Token expired' })
  })
})

describe('publishToInstagram', () => {
  it('returns success after container + publish flow', async () => {
    // Create media container
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_abc' }) })
    // Publish container
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'ig_post_xyz' }) })

    const result = await publishToInstagram('page-token', 'ig-account-123', 'Caption text', 'https://image.url/photo.jpg')
    expect(result).toEqual({ success: true, postId: 'ig_post_xyz' })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
