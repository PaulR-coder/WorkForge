import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const KEY = Buffer.from(process.env.SOCIAL_TOKEN_SECRET!, 'hex') // 32 bytes

export function encryptToken(token: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptToken(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(':')
  const decipher = createDecipheriv('aes-256-cbc', KEY, Buffer.from(ivHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}
