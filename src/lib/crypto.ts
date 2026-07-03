/**
 * AES-256-GCM symmetric encryption / decryption utility.
 * Used to encrypt user-supplied LLM API keys before storing them in MongoDB.
 *
 * Key material is derived from the ENCRYPTION_KEY env var (or JWT_SECRET as fallback)
 * using a single SHA-256 hash to produce a 32-byte key.
 */

import crypto from 'crypto'

const RAW_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || ''

function getKey(): Buffer {
  if (!RAW_KEY) {
    throw new Error('ENCRYPTION_KEY (or JWT_SECRET) env var is not set')
  }
  // Derive a 256-bit key deterministically from the env secret.
  return crypto.createHash('sha256').update(RAW_KEY).digest()
}

/**
 * Encrypts `plaintext` with AES-256-GCM.
 * Returns a colon-separated hex string: `iv:authTag:ciphertext`
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Decrypts an `iv:authTag:ciphertext` hex string produced by `encrypt()`.
 */
export function decrypt(encoded: string): string {
  const key = getKey()
  const parts = encoded.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format')

  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}
