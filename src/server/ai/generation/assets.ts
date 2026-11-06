import sharp, { type OutputInfo } from 'sharp'
import { prisma } from '@/server/db'
import { readMediaBuffer, saveMedia, signedMediaUrl } from '@/server/media'
import { ProviderError } from './types'

const MAX_REMOTE_BYTES = 20 * 1024 * 1024

function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}

export function absoluteMediaUrl(url: string): string {
  if (/^(https?:|data:)/i.test(url)) return url
  return `${appUrl()}${url.startsWith('/') ? '' : '/'}${url}`
}

export function isAllowedInputUrl(url: string): boolean {
  if (url.startsWith('/api/media/')) return true
  if (!/^https?:\/\//i.test(url)) return false

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.local') || host === '0.0.0.0') return false
    if (host === '::1' || host === '[::1]') return false

    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4) {
      const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
      if (a === 10 || a === 127 || a === 0) return false
      if (a === 169 && b === 254) return false
      if (a === 172 && b >= 16 && b <= 31) return false
      if (a === 192 && b === 168) return false
      if (a === 100 && b >= 64 && b <= 127) return false
    }

    return true
  } catch {
    return false
  }
}

/** 把内部媒体 URL 读取为 data URL（Mock 供应商/自建模型使用，避免外网不可达） */
export async function localUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  const match = url.match(/^\/api\/media\/([^/?#]+)/)
  if (!match) return absoluteMediaUrl(url)

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: match[1], status: 'READY', deletedAt: null },
  })
  if (!asset) throw new ProviderError('MEDIA_NOT_FOUND', '素材图片不存在', { retryable: false })

  const buffer = await readMediaBuffer(asset)
  return `data:${asset.mimeType};base64,${buffer.toString('base64')}`
}

export async function loadImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',')
    if (comma === -1) throw new ProviderError('INVALID_IMAGE', '图片 data URL 格式错误')
    const base64 = url.slice(comma + 1)
    const buffer = Buffer.from(base64, 'base64')
    if (buffer.byteLength > MAX_REMOTE_BYTES) {
      throw new ProviderError('IMAGE_TOO_LARGE', '图片超过 20MB', { retryable: false })
    }
    return buffer
  }

  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  } catch {
    throw new ProviderError('IMAGE_FETCH_FAILED', '图片下载失败', { retryable: true })
  }
  if (!response.ok) {
    throw new ProviderError('IMAGE_FETCH_FAILED', `图片下载失败 (${response.status})`, {
      retryable: true,
    })
  }
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > MAX_REMOTE_BYTES) {
    throw new ProviderError('IMAGE_TOO_LARGE', '图片超过 20MB', { retryable: false })
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > MAX_REMOTE_BYTES) {
    throw new ProviderError('IMAGE_TOO_LARGE', '图片超过 20MB', { retryable: false })
  }
  return buffer
}

export interface PersistedImage {
  imageUrl: string
  thumbnailUrl: string
  width: number
  height: number
  imageId: string
}

/** 把供应商返回的图片重编码后落库（私有），并生成缩略图 */
export async function persistGeneratedImage(
  buffer: Buffer,
  userId: string,
  metadata: Record<string, unknown>,
): Promise<PersistedImage> {
  let normalized: Buffer
  let info: OutputInfo
  try {
    const result = await sharp(buffer)
      .rotate()
      .resize({ width: 1536, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })
    normalized = result.data
    info = result.info
  } catch {
    throw new ProviderError('INVALID_IMAGE', '供应商返回的不是有效图片', { retryable: false })
  }

  const main = await saveMedia({
    ownerId: userId,
    kind: 'RESULT',
    buffer: normalized,
    mimeType: 'image/jpeg',
    width: info.width,
    height: info.height,
    visibility: 'PRIVATE',
    metadata: { ...metadata, generated: true },
  })

  const thumbBuffer = await sharp(normalized)
    .resize({ width: 480, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()
  const thumbInfo = await sharp(thumbBuffer).metadata()

  const thumb = await saveMedia({
    ownerId: userId,
    kind: 'RESULT',
    buffer: thumbBuffer,
    mimeType: 'image/jpeg',
    width: thumbInfo.width,
    height: thumbInfo.height,
    visibility: 'PRIVATE',
    metadata: { ...metadata, thumbnail: true, variantOf: main.id },
  })

  return {
    imageUrl: signedMediaUrl(main.id, 900),
    thumbnailUrl: signedMediaUrl(thumb.id, 900),
    width: info.width,
    height: info.height,
    imageId: main.id,
  }
}
