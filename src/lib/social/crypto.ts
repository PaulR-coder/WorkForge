import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey(): Buffer {
  const secret = process.env.SOCIAL_TOKEN_SECRET
  if (!secret) throw new Error('SOCIAL_TOKEN_SECRET is not set')
  return Buffer.from(secret, 'hex')
}

export function encryptToken(token: string): string {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptToken(encrypted: string): string {
  const key = getKey()
  const [ivHex, dataHex] = encrypted.split(':')
  const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}
