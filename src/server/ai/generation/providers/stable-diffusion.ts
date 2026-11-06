import { BaseImageProvider } from '../base-provider'
import { loadImageBuffer } from '../assets'
import { ProviderError, type ProviderRequest, type ProviderSubmit } from '../types'
import type { ImageGenerationKind } from '@/types/image-generation'

interface SdResponse {
  images?: string[]
  info?: string
  error?: string
}

/**
 * Stable Diffusion WebUI (AUTOMATIC1111) 适配器。
 * 有用户照片走 img2img；没有照片走 txt2img（适合推荐画报）。
 */
export class StableDiffusionProvider extends BaseImageProvider {
  readonly id = 'stable-diffusion' as const

  private get baseUrl() {
    return (process.env.SD_API_URL?.trim() || 'http://127.0.0.1:7860').replace(/\/+$/, '')
  }

  isConfigured(): boolean {
    return Boolean(process.env.SD_API_URL?.trim())
  }

  supports(_kind: ImageGenerationKind): boolean {
    return true
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const key = process.env.SD_API_KEY?.trim()
    if (key) headers.Authorization = `Bearer ${key}`
    return headers
  }

  async submit(request: ProviderRequest): Promise<ProviderSubmit> {
    const base = {
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      width: request.width,
      height: request.height,
      seed: request.seed,
      steps: Number(process.env.SD_STEPS ?? 28),
      cfg_scale: Number(process.env.SD_CFG ?? 6),
      sampler_name: process.env.SD_SAMPLER ?? 'DPM++ 2M Karras',
    }

    let endpoint = `${this.baseUrl}/sdapi/v1/txt2img`
    let payload: Record<string, unknown> = base

    if (request.userPhotoUrl) {
      const image = await loadImageBuffer(request.userPhotoUrl)
      endpoint = `${this.baseUrl}/sdapi/v1/img2img`
      payload = {
        ...base,
        init_images: [image.toString('base64')],
        denoising_strength: Number(process.env.SD_DENOISING ?? 0.55),
      }
    }

    const data = await this.fetchJson<SdResponse>(
      endpoint,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload),
      },
      120_000,
    )

    const image = data.images?.[0]
    if (!image) {
      throw new ProviderError('PROVIDER_BAD_RESPONSE', data.error ?? 'Stable Diffusion 未返回图片', {
        retryable: true,
      })
    }

    return {
      jobId: `sd-${Date.now()}`,
      status: 'succeeded',
      progress: 100,
      imageUrl: image.startsWith('data:') ? image : `data:image/png;base64,${image}`,
    }
  }
}
