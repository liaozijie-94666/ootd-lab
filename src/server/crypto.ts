import crypto from 'node:crypto'
import { getMediaKey } from '@/server/env'

const IV_BYTES = 12
const TAG_BYTES = 16

/**
 * AES-256-GCM 信封格式: [iv(12)][authTag(16)][ciphertext]
 * 只用于人脸/全身照等敏感影像；结果图与目录图不加密。
 */
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', getMediaKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext])
}

export function decryptBuffer(payload: Buffer): Buffer {
  if (payload.length <= IV_BYTES + TAG_BYTES) {
    throw new Error('加密数据长度非法')
  }
  const iv = payload.subarray(0, IV_BYTES)
  const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES)
  const decipher = crypto.createDecipheriv('aes-256-gcm', getMediaKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}
