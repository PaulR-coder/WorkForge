import { publishToLinkedIn } from '@/lib/social/linkedin'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => mockFetch.mockReset())

describe('publishToLinkedIn', () => {
  it('returns success on text-only post', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (h: string) => h === 'x-restli-id' ? 'urn:li:share:123456' : null },
      json: async () => ({}),
    })

    const result = await publishToLinkedIn('access-token', 'urn:li:organization:12345', 'Post text')
    expect(result).toEqual({ success: true, postId: 'urn:li:share:123456' })
  })

  it('returns failure on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      headers: { get: () => null },
      json: async () => ({ message: 'Unauthorized' }),
    })

    const result = await publishToLinkedIn('bad-token', 'urn:li:organization:12345', 'Post')
    expect(result.success).toBe(false)
  })
})
