import sharp from 'sharp'
import type { MediaAsset } from '@prisma/client'
import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import { saveMedia, mediaUrl } from '@/server/media'
import { serverEnv } from '@/server/env'
import { detectFullBody, type BodyCheckResult } from '@/server/imaging/body-detect'
import { createUserClothing } from '@/server/services/clothing.service'
import { clothingFieldsSchema, uploadPhotoFieldsSchema } from '@/server/validation'
import type { ClothingItem, PhotoInfo } from '@/types/studio'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const POLICY_VERSION = '2026-11-01'

export function readFileField(form: FormData, field = 'file'): File {
  const value = form.get(field)
  if (!(value instanceof File)) {
    throw new ApiError('VALIDATION_ERROR', '请选择要上传的图片', 400, { field })
  }
  return value
}

async function readImage(file: File): Promise<{ buffer: Buffer; format: string | undefined }> {
  if (file.size > serverEnv.maxUploadBytes) {
    throw new ApiError(
      'FILE_TOO_LARGE',
      `图片不能超过 ${Math.round(serverEnv.maxUploadBytes / 1024 / 1024)}MB`,
      413,
    )
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new ApiError('UNSUPPORTED_MEDIA_TYPE', '仅支持 JPG / PNG / WebP', 415)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let format: string | undefined
  try {
    const meta = await sharp(buffer).metadata()
    format = meta.format
    if (!meta.width || !meta.height) throw new Error('no dimensions')
  } catch {
    throw new ApiError('UNSUPPORTED_MEDIA_TYPE', '文件不是有效图片', 415)
  }
  if (!format || !['jpeg', 'png', 'webp'].includes(format)) {
    throw new ApiError('UNSUPPORTED_MEDIA_TYPE', '仅支持 JPG / PNG / WebP', 415)
  }
  if (buffer.byteLength > serverEnv.maxUploadBytes) {
    throw new ApiError(
      'FILE_TOO_LARGE',
      `图片不能超过 ${Math.round(serverEnv.maxUploadBytes / 1024 / 1024)}MB`,
      413,
    )
  }
  return { buffer, format }
}

function toPhotoDto(asset: MediaAsset): PhotoInfo {
  return {
    id: asset.id,
    url: mediaUrl(asset.id) as string,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    kind: asset.kind === 'FACE' ? 'FACE' : 'FULL_BODY',
    encrypted: asset.encryption === 'AES_256_GCM',
  }
}

interface UploadPhotoResult {
  photo: PhotoInfo
  bodyCheck: BodyCheckResult
}

export async function uploadUserPhoto(form: FormData, userId: string): Promise<UploadPhotoResult> {
  const fields = uploadPhotoFieldsSchema.parse({
    kind: form.get('kind') ?? 'body',
    consent: form.get('consent')?.toString(),
    policyVersion: form.get('policyVersion')?.toString(),
  })

  const file = readFileField(form, 'file')
  const kind = fields.kind === 'face' ? 'FACE' : 'FULL_BODY'

  if (fields.consent !== 'true') {
    throw new ApiError('CONSENT_REQUIRED', '请先阅读并同意照片处理规则', 403)
  }

  const { buffer } = await readImage(file)

  const normalized = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()

  const meta = await sharp(normalized).metadata()

  const asset = await saveMedia({
    ownerId: userId,
    kind,
    buffer: normalized,
    mimeType: 'image/jpeg',
    width: meta.width,
    height: meta.height,
    encrypt: true,
  })

  await prisma.consent.create({
    data: {
      userId,
      type: kind === 'FACE' ? 'FACE_IMAGE_PROCESSING' : 'FULL_BODY_PROCESSING',
      policyVersion: fields.policyVersion ?? POLICY_VERSION,
      granted: true,
      mediaAssetId: asset.id,
      userAgent: null,
    },
  })

  const bodyCheck =
    kind === 'FULL_BODY'
      ? await detectFullBody(normalized)
      : { isFullBody: true, confidence: 1, message: '人脸照仅用于保留面部特征，默认加密存储' }

  return { photo: toPhotoDto(asset), bodyCheck }
}

export async function uploadUserClothing(form: FormData, userId: string): Promise<ClothingItem> {
  const raw: Record<string, string> = {}
  for (const key of ['name', 'category', 'color', 'style', 'season', 'material', 'brand', 'price', 'purchaseUrl']) {
    const value = form.get(key)
    if (typeof value === 'string' && value.trim() !== '') raw[key] = value.trim()
  }

  const fields = clothingFieldsSchema.parse(raw)
  const file = readFileField(form, 'file')
  const { buffer, format } = await readImage(file)

  return createUserClothing({
    userId,
    name: fields.name,
    category: fields.category,
    color: fields.color,
    style: fields.style,
    season: fields.season,
    material: fields.material,
    brand: fields.brand,
    price: fields.price,
    purchaseUrl: fields.purchaseUrl,
    file: buffer,
    mimeType: format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg',
  })
}
