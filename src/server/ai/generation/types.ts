import type {
  ImageGenerationKind,
  ImageProviderId,
  ImageTaskState,
} from '@/types/image-generation'

export interface ProviderRequest {
  kind: ImageGenerationKind
  prompt: string
  negativePrompt: string
  userPhotoUrl?: string | null
  clothingImageUrls: string[]
  width: number
  height: number
  seed: number
  scene?: string
  styleSummary?: string
  metadata?: Record<string, unknown>
}

export interface ProviderSubmit {
  jobId: string
  status: Extract<ImageTaskState, 'queued' | 'processing' | 'succeeded'>
  progress?: number
  imageUrl?: string
  /** 同步供应商直接返回图片字节（服务端内部使用，不暴露给客户端） */
  imageBuffer?: Buffer
  raw?: unknown
}

export interface ProviderPoll {
  status: ImageTaskState
  progress?: number
  imageUrl?: string
  imageBuffer?: Buffer
  error?: { code: string; message: string; retryable?: boolean }
  raw?: unknown
}

export interface ImageProvider {
  readonly id: ImageProviderId
  isConfigured(): boolean
  supports(kind: ImageGenerationKind): boolean
  submit(request: ProviderRequest): Promise<ProviderSubmit>
  poll(jobId: string, request: ProviderRequest): Promise<ProviderPoll>
  verifyWebhook?(headers: Headers, rawBody: string): boolean
  parseWebhook?(payload: unknown): {
    jobId: string
    status: ImageTaskState
    imageUrl?: string
    error?: { code: string; message: string; retryable?: boolean }
  }
}

export class ProviderError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly statusCode?: number

  constructor(code: string, message: string, options?: { retryable?: boolean; statusCode?: number }) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.retryable = options?.retryable ?? false
    this.statusCode = options?.statusCode
  }
}

export class SafetyError extends Error {
  readonly code = 'SAFETY_VIOLATION'
  readonly matches: string[]

  constructor(matches: string[]) {
    super('内容包含不允许的描写，请修改场景或风格描述')
    this.name = 'SafetyError'
    this.matches = matches
  }
}
