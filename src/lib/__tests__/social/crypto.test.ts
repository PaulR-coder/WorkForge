// Set env before importing module
process.env.SOCIAL_TOKEN_SECRET = 'a'.repeat(64) // 32 bytes as hex = 64 hex chars

import { encryptToken, decryptToken } from '@/lib/social/crypto'

describe('encryptToken / decryptToken', () => {
  it('round-trips a token', () => {
    const original = 'EAABsbCS...facebook-access-token'
    const encrypted = encryptToken(original)
    expect(decryptToken(encrypted)).toBe(original)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const t = 'same-token'
    expect(encryptToken(t)).not.toBe(encryptToken(t))
  })

  it('encrypted value is not the plaintext', () => {
    const t = 'my-secret-token'
    expect(encryptToken(t)).not.toContain(t)
  })
})
