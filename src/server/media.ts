import crypto from 'node:crypto'
import type { MediaAsset, Prisma } from '@prisma/client'
import { prisma } from '@/server/db'
import { storage } from '@/server/storage'
import { decryptBuffer, encryptBuffer } from '@/server/crypto'
import { ApiError } from '@/server/http'

export type MediaKindInput =
  | 'FACE'
  | 'FULL_BODY'
  | 'GARMENT_RAW'
  | 'GARMENT_CUTOUT'
  | 'RESULT'
  | 'POST_IMAGE'
  | 'EXPORT'

interface SaveMediaInput {
  ownerId: string
  kind: MediaKindInput
  buffer: Buffer
  mimeType: string
  width?: number
  height?: number
  encrypt?: boolean
  visibility?: 'PRIVATE' | 'PUBLIC'
  metadata?: Record<string, unknown>
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'jpg'
  }
}

export function mediaUrl(assetId: string | null | undefined): string | null {
  return assetId ? `/api/media/${assetId}` : null
}

function mediaUrlSecret(): string {
  return (
    process.env.MEDIA_URL_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    'ootd-lab-dev-media-url-secret'
  )
}

function signMedia(assetId: string, exp: number): string {
  return crypto.createHmac('sha256', mediaUrlSecret()).update(`${assetId}.${exp}`).digest('base64url')
}

/** 私有媒体的短期签名 URL（默认 10 分钟），用于 <img> 等无法携带会话头的场景。 */
export function signedMediaUrl(assetId: string, ttlSeconds = 600): string {
  const exp = Math.floor(Date.now() / 1000) + Math.max(30, Math.min(3600, ttlSeconds))
  return `/api/media/${assetId}?exp=${exp}&sig=${signMedia(assetId, exp)}`
}

export function verifyMediaSignature(assetId: string, expRaw: string | null, sig: string | null): boolean {
  if (!expRaw || !sig) return false
  const exp = Number(expRaw)
  if (!Number.isInteger(exp)) return false
  const now = Math.floor(Date.now() / 1000)
  if (exp <= now || exp > now + 3600) return false

  const expected = signMedia(assetId, exp)
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export async function getMediaAsset(assetId: string): Promise<MediaAsset> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: assetId, status: 'READY', deletedAt: null },
  })
  if (!asset) throw new ApiError('NOT_FOUND', '图片不存在', 404)
  return asset
}

export async function saveMedia(input: SaveMediaInput): Promise<MediaAsset> {
  const id = crypto.randomUUID()
  const encrypted = input.encrypt ?? false
  const ext = encrypted ? 'enc' : extensionFor(input.mimeType)
  const storageKey = `users/${input.ownerId}/${input.kind.toLowerCase()}/${id}.${ext}`
  const payload = encrypted ? encryptBuffer(input.buffer) : input.buffer

  await storage.put(storageKey, payload)

  return prisma.mediaAsset.create({
    data: {
      id,
      ownerId: input.ownerId,
      kind: input.kind,
      status: 'READY',
      visibility: input.visibility ?? 'PRIVATE',
      storageKey,
      mimeType: input.mimeType,
      bytes: payload.byteLength,
      width: input.width,
      height: input.height,
      encryption: encrypted ? 'AES_256_GCM' : 'NONE',
      isSensitive: input.kind === 'FACE' || input.kind === 'FULL_BODY',
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  })
}

export async function readMediaBuffer(asset: MediaAsset): Promise<Buffer> {
  let raw: Buffer
  try {
    raw = await storage.get(asset.storageKey)
  } catch {
    throw new ApiError('MEDIA_MISSING', '图片文件不存在或已被清理', 404)
  }
  if (asset.encryption === 'AES_256_GCM') {
    try {
      return decryptBuffer(raw)
    } catch {
      throw new ApiError('MEDIA_DECRYPT_FAILED', '图片解密失败', 500)
    }
  }
  return raw
}

export async function getOwnedMedia(assetId: string, userId: string): Promise<MediaAsset> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: assetId, ownerId: userId, status: 'READY', deletedAt: null },
  })
  if (!asset) throw new ApiError('NOT_FOUND', '图片不存在', 404)
  return asset
}

export async function getReadableMedia(assetId: string, userId: string): Promise<MediaAsset> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: assetId, status: 'READY', deletedAt: null },
  })
  if (!asset) throw new ApiError('NOT_FOUND', '图片不存在', 404)
  if (asset.visibility !== 'PUBLIC' && asset.ownerId !== userId) {
    throw new ApiError('NOT_FOUND', '图片不存在', 404)
  }
  return asset
}

/**
 * 用户主动分享时，把私有结果复制为公开帖子图。
 * 只复制生成结果，不复制源照片；返回可公开访问的媒体 id。
 */
export async function copyMediaToPublic(assetId: string, userId: string): Promise<string> {
  const asset = await getOwnedMedia(assetId, userId)
  if (asset.visibility === 'PUBLIC') return asset.id

  const buffer = await readMediaBuffer(asset)
  const copy = await saveMedia({
    ownerId: userId,
    kind: 'POST_IMAGE',
    buffer,
    mimeType: asset.mimeType,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    visibility: 'PUBLIC',
    metadata: { copiedFrom: asset.id, shared: true },
  })
  return copy.id
}

export async function softDeleteMedia(assetId: string, userId: string): Promise<void> {  const asset = await getOwnedMedia(assetId, userId)
  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { status: 'DELETED', deletedAt: new Date() },
  })
  // 内容立即不可读；物理文件异步清理，失败不影响用户操作
  void storage.remove(asset.storageKey).catch((error) => {
    console.warn('[media] 清理文件失败', asset.storageKey, error)
  })
}
