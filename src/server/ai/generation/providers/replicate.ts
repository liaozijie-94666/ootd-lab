import { BaseImageProvider } from '../base-provider'
import { ProviderError, type ProviderPoll, type ProviderRequest, type ProviderSubmit } from '../types'
import type { ImageGenerationKind } from '@/types/image-generation'

interface ReplicatePrediction {
  id?: string
  status?: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
  logs?: string | null
}

/**
 * Replicate 通用适配器：用 version 指定模型（IDM-VTON / SDXL / 自定义）。
 * 创建：POST /v1/predictions；轮询：GET /v1/predictions/:id。
 */
export class ReplicateProvider extends BaseImageProvider {
  readonly id: import('@/types/image-generation').ImageProviderId = 'replicate'

  protected get versionEnv(): string {
    return 'REPLICATE_MODEL_VERSION'
  }

  isConfigured(): boolean {
    return Boolean(process.env.REPLICATE_API_TOKEN?.trim() && process.env[this.versionEnv]?.trim())
  }

  supports(_kind: ImageGenerationKind): boolean {
    return true
  }

  protected buildInput(request: ProviderRequest): Record<string, unknown> {
    return {
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      width: request.width,
      height: request.height,
      seed: request.seed,
      ...(request.userPhotoUrl ? { image: request.userPhotoUrl } : {}),
      ...(request.clothingImageUrls[0] ? { garment_image: request.clothingImageUrls[0] } : {}),
      ...(request.metadata ?? {}),
    }
  }

  async submit(request: ProviderRequest): Promise<ProviderSubmit> {
    const version = this.requireEnv(this.versionEnv)

    const prediction = await this.fetchJson<ReplicatePrediction>(
      'https://api.replicate.com/v1/predictions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.requireEnv('REPLICATE_API_TOKEN')}`,
        },
        body: JSON.stringify({
          version,
          input: this.buildInput(request),
        }),
      },
    )

    if (!prediction.id) {
      throw new ProviderError('PROVIDER_BAD_RESPONSE', 'Replicate 未返回 prediction id', {
        retryable: true,
      })
    }

    const imageUrl = firstOutput(prediction.output)
    return {
      jobId: prediction.id,
      status: imageUrl ? 'succeeded' : 'queued',
      progress: imageUrl ? 100 : 5,
      imageUrl,
      raw: prediction,
    }
  }

  async poll(jobId: string): Promise<ProviderPoll> {
    const prediction = await this.fetchJson<ReplicatePrediction>(
      `https://api.replicate.com/v1/predictions/${jobId}`,
      {
        headers: { Authorization: `Bearer ${this.requireEnv('REPLICATE_API_TOKEN')}` },
      },
    )

    switch (prediction.status) {
      case 'succeeded':
        return {
          status: 'succeeded',
          progress: 100,
          imageUrl: firstOutput(prediction.output),
          raw: prediction,
        }
      case 'failed':
      case 'canceled':
        return {
          status: 'failed',
          error: {
            code: 'PROVIDER_FAILED',
            message: prediction.error ?? 'Replicate 生成失败',
            retryable: true,
          },
          raw: prediction,
        }
      case 'processing':
        return { status: 'processing', progress: 55, raw: prediction }
      default:
        return { status: 'queued', progress: 15, raw: prediction }
    }
  }

  parseWebhook(payload: unknown) {
    const data = payload as ReplicatePrediction
    if (!data?.id || !data.status) {
      throw new ProviderError('WEBHOOK_INVALID', '无效的 Replicate 回调', { retryable: false })
    }
    return {
      jobId: data.id,
      status:
        data.status === 'succeeded'
          ? ('succeeded' as const)
          : data.status === 'failed' || data.status === 'canceled'
            ? ('failed' as const)
            : ('processing' as const),
      imageUrl: firstOutput(data.output) ?? undefined,
      error:
        data.status === 'failed'
          ? { code: 'PROVIDER_FAILED', message: data.error ?? '生成失败', retryable: true }
          : undefined,
    }
  }
}

export function firstOutput(output: ReplicatePrediction['output']): string | undefined {
  if (typeof output === 'string') return output
  if (Array.isArray(output)) return output.find((item) => typeof item === 'string')
  return undefined
}
