import {
  ProviderError,
  type ProviderPoll,
  type ProviderRequest,
  type ProviderSubmit,
} from './types'
import type { ImageProviderId } from '@/types/image-generation'

export abstract class BaseImageProvider {
  abstract readonly id: ImageProviderId

  abstract isConfigured(): boolean

  abstract submit(request: ProviderRequest): Promise<ProviderSubmit>

  async poll(_jobId: string, _request: ProviderRequest): Promise<ProviderPoll> {
    throw new ProviderError('NOT_SUPPORTED', `${this.id} 不支持轮询`, { retryable: false })
  }

  protected requireEnv(name: string): string {
    const value = process.env[name]?.trim()
    if (!value) {
      throw new ProviderError('PROVIDER_NOT_CONFIGURED', `缺少环境变量 ${name}`, {
        retryable: false,
      })
    }
    return value
  }

  protected async fetchJson<T>(
    url: string,
    init: RequestInit = {},
    timeoutMs = 60_000,
  ): Promise<T> {
    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Accept: 'application/json',
          ...init.headers,
        },
      })
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'TimeoutError'
      throw new ProviderError(
        aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK',
        aborted ? `${this.id} 请求超时` : `${this.id} 网络错误`,
        { retryable: true },
      )
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new ProviderError(
        `PROVIDER_HTTP_${response.status}`,
        `${this.id} 返回 ${response.status}: ${body.slice(0, 200)}`,
        {
          retryable: response.status === 408 || response.status === 429 || response.status >= 500,
          statusCode: response.status,
        },
      )
    }

    return (await response.json()) as T
  }
}
