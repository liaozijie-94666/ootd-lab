import { BaseImageProvider } from '../base-provider'
import { ProviderError, type ProviderPoll, type ProviderRequest, type ProviderSubmit } from '../types'

interface FashnRunResponse {
  id?: string
  error?: { name?: string; message?: string }
}

interface FashnStatusResponse {
  id?: string
  status?: 'starting' | 'processing' | 'completed' | 'failed'
  output?: string[]
  error?: { name?: string; message?: string }
}

/**
 * Fashn 虚拟试衣（官方 REST）。
 * 文档：POST /v1/run → { id }；GET /v1/status/:id。
 * 限制：单次只接受一件 garment，因此多件搭配会拼接/取第一件。
 */
export class FashnProvider extends BaseImageProvider {
  readonly id = 'fashn' as const

  private get baseUrl() {
    return (process.env.FASHN_BASE_URL?.trim() || 'https://api.fashn.ai/v1').replace(/\/+$/, '')
  }

  isConfigured(): boolean {
    return Boolean(process.env.FASHN_API_KEY?.trim())
  }

  supports(kind: 'tryon' | 'recommendation'): boolean {
    return kind === 'tryon'
  }

  async submit(request: ProviderRequest): Promise<ProviderSubmit> {
    if (!request.userPhotoUrl) {
      throw new ProviderError('INVALID_INPUT', 'Fashn 需要用户照片', { retryable: false })
    }
    if (request.clothingImageUrls.length !== 1) {
      throw new ProviderError(
        'INVALID_INPUT',
        'Fashn 单次仅支持一件衣服，请先合成搭配或改用 Replicate',
        { retryable: false },
      )
    }

    const data = await this.fetchJson<FashnRunResponse>(`${this.baseUrl}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.requireEnv('FASHN_API_KEY')}`,
      },
      body: JSON.stringify({
        model_image: request.userPhotoUrl,
        garment_image: request.clothingImageUrls[0],
        category: 'auto',
        mode: 'balanced',
        seed: request.seed,
      }),
    })

    if (!data.id) {
      throw new ProviderError('PROVIDER_BAD_RESPONSE', 'Fashn 未返回任务 ID', {
        retryable: true,
      })
    }

    return { jobId: data.id, status: 'queued', progress: 5, raw: data }
  }

  async poll(jobId: string): Promise<ProviderPoll> {
    const data = await this.fetchJson<FashnStatusResponse>(`${this.baseUrl}/status/${jobId}`, {
      headers: { Authorization: `Bearer ${this.requireEnv('FASHN_API_KEY')}` },
    })

    switch (data.status) {
      case 'completed':
        return {
          status: 'succeeded',
          progress: 100,
          imageUrl: data.output?.[0],
          raw: data,
        }
      case 'failed':
        return {
          status: 'failed',
          error: {
            code: data.error?.name ?? 'PROVIDER_FAILED',
            message: data.error?.message ?? 'Fashn 生成失败',
            retryable: true,
          },
          raw: data,
        }
      case 'processing':
        return { status: 'processing', progress: 60, raw: data }
      default:
        return { status: 'queued', progress: 15, raw: data }
    }
  }
}
