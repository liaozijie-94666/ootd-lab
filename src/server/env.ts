import crypto from 'node:crypto'
import path from 'node:path'

function resolveDataDir() {
  return path.resolve(process.cwd(), process.env.OOTD_DATA_DIR ?? '.data')
}

export const serverEnv = {
  get dataDir() {
    return resolveDataDir()
  },
  get dbDriver(): 'pglite' | 'postgres' {
    return process.env.DB_DRIVER === 'postgres' ? 'postgres' : 'pglite'
  },
  get databaseUrl() {
    return process.env.DATABASE_URL
  },
  get demoUserEmail() {
    return process.env.DEMO_USER_EMAIL ?? 'demo@ootd.local'
  },
  get maxUploadBytes() {
    const configured = Number(process.env.MAX_UPLOAD_BYTES ?? '')
    return Number.isFinite(configured) && configured > 0 ? configured : 4 * 1024 * 1024
  },
}

const DEV_KEK = crypto.createHash('sha256').update('ootd-lab-dev-kek-v1').digest()

export function getMediaKey(): Buffer {
  const raw = process.env.MEDIA_KEK?.trim()
  if (!raw) return DEV_KEK
  try {
    const key = Buffer.from(raw, 'base64')
    if (key.length === 32) return key
  } catch {
    // fall through to dev key
  }
  console.warn('[security] MEDIA_KEK 不是合法的 32 字节 base64，已回退到开发密钥')
  return DEV_KEK
}
