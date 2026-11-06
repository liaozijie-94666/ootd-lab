import { ProviderError, type ProviderRequest } from './types'
import type { ImageGenerationKind } from '@/types/image-generation'

export interface BuiltPrompt {
  prompt: string
  negativePrompt: string
  width: number
  height: number
  seed: number
}

const DEFAULT_NEGATIVE = [
  'low quality',
  'blurry',
  'distorted anatomy',
  'extra fingers',
  'deformed hands',
  'text',
  'watermark',
  'logo',
  'nsfw',
  'nude',
  'violence',
  'gore',
].join(', ')

function clampSize(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value)) return fallback
  return Math.min(1536, Math.max(512, Math.round(value)))
}

export function buildPrompt(
  input: {
    kind: ImageGenerationKind
    scene?: string
    stylePrompt?: string
    negativePrompt?: string
    width?: number
    height?: number
    seed?: number
    styleSummary?: string
    metadata?: Record<string, unknown>
  },
): BuiltPrompt {
  const scene = input.scene?.trim() ?? ''
  const styleSummary = input.styleSummary?.trim() ?? ''
  const base =
    input.stylePrompt?.trim() ||
    (input.kind === 'tryon'
      ? `full body fashion photograph of the person wearing the provided outfit${
          scene ? `, ${scene}` : ''
        }${styleSummary ? `, ${styleSummary}` : ''}, natural pose, editorial styling, soft daylight, sharp details`
      : `editorial fashion lookbook, ${styleSummary || 'complete outfit'}${scene ? `, ${scene}` : ''}, flat lay composition, warm neutral background, soft studio light, high detail`)

  return {
    prompt: base.slice(0, 1200),
    negativePrompt: (input.negativePrompt?.trim() || DEFAULT_NEGATIVE).slice(0, 800),
    width: clampSize(input.width, 1024),
    height: clampSize(input.height, 1365),
    seed:
      typeof input.seed === 'number' && Number.isFinite(input.seed)
        ? Math.abs(Math.floor(input.seed)) % 2_147_483_647
        : Math.floor(Math.random() * 1_000_000_000),
  }
}

export function toProviderRequest(
  built: BuiltPrompt,
  input: {
    userPhotoUrl?: string | null
    clothingImageUrls: string[]
    scene?: string
    styleSummary?: string
    metadata?: Record<string, unknown>
  },
  kind: ImageGenerationKind,
  resolveUrl: (url: string) => string,
): ProviderRequest {
  return {
    kind,
    prompt: built.prompt,
    negativePrompt: built.negativePrompt,
    userPhotoUrl: input.userPhotoUrl ? resolveUrl(input.userPhotoUrl) : undefined,
    clothingImageUrls: input.clothingImageUrls.map(resolveUrl),
    width: built.width,
    height: built.height,
    seed: built.seed,
    scene: input.scene,
    styleSummary: input.styleSummary,
    metadata: input.metadata,
  }
}

export function assertProviderRequest(request: ProviderRequest): void {
  if (request.clothingImageUrls.length === 0) {
    throw new ProviderError('INVALID_INPUT', '至少需要一张衣服图片', { retryable: false })
  }
  if (request.kind === 'tryon' && !request.userPhotoUrl) {
    throw new ProviderError('INVALID_INPUT', '试衣需要用户照片', { retryable: false })
  }
}
