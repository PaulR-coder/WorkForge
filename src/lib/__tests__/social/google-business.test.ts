import { publishToGoogleBusiness } from '@/lib/social/google-business'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => mockFetch.mockReset())

describe('publishToGoogleBusiness', () => {
  it('returns success on text-only post', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'accounts/123/locations/456/localPosts/789' }),
    })

    const result = await publishToGoogleBusiness(
      'access-token',
      'accounts/123/locations/456',
      'Great service today!'
    )
    expect(result).toEqual({ success: true, postId: 'accounts/123/locations/456/localPosts/789' })
  })

  it('returns failure on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Token expired' } }),
    })

    const result = await publishToGoogleBusiness('bad-token', 'accounts/123/locations/456', 'Post')
    expect(result).toEqual({ success: false, error: 'Token expired' })
  })
})
