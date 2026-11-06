export type ImageGenerationKind = 'tryon' | 'recommendation'

export type ImageProviderId =
  | 'mock'
  | 'fashn'
  | 'replicate'
  | 'idm-vton'
  | 'comfyui'
  | 'stable-diffusion'

export type ImageTaskState = 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled'

export interface ImageGenerationError {
  code: string
  message: string
  retryable: boolean
}

export interface ImageGenerationOptions {
  scene?: string
  stylePrompt?: string
  negativePrompt?: string
  width?: number
  height?: number
  seed?: number
  provider?: ImageProviderId
  metadata?: Record<string, unknown>
}

export interface TryOnInput extends ImageGenerationOptions {
  userPhotoUrl: string
  clothingImageUrls: string[]
  poseHint?: 'standing' | 'walking' | 'sitting'
  preserveFace?: boolean
  background?: 'original' | 'plain' | 'scene'
}

export interface RecommendationImageInput extends ImageGenerationOptions {
  userPhotoUrl?: string | null
  clothingImageUrls: string[]
  styleSummary?: string
  referenceOutfit?: string
}

export interface GeneratedImage {
  imageUrl: string
  thumbnailUrl: string
  width: number
  height: number
  provider: ImageProviderId
  durationMs: number
  degraded: boolean
}

export interface GenerationResult {
  taskId: string
  status: ImageTaskState
  provider: ImageProviderId
  progress: number
  imageUrl?: string
  thumbnailUrl?: string
  width?: number
  height?: number
  durationMs?: number
  error?: ImageGenerationError
  fallbackText?: string
}

export interface GenerationLogEntry {
  status: string
  message: string | null
  createdAt: string
}

export interface GenerationTaskStatus extends GenerationResult {
  attempts: number
  createdAt: string
  updatedAt: string
  providerJobId?: string | null
  logs: GenerationLogEntry[]
}
