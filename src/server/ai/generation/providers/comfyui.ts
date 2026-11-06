import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { BaseImageProvider } from '../base-provider'
import { ProviderError, type ProviderPoll, type ProviderRequest, type ProviderSubmit } from '../types'
import type { ImageGenerationKind } from '@/types/image-generation'

interface ComfyPromptResponse {
  prompt_id?: string
  error?: unknown
}

interface ComfyHistoryEntry {
  status?: { completed?: boolean; status_str?: string }
  outputs?: Record<
    string,
    { images?: Array<{ filename: string; subfolder?: string; type?: string }> }
  >
}

function inject(value: unknown, vars: Record<string, string | number>): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
      vars[key] == null ? '' : String(vars[key]),
    )
  }
  if (Array.isArray(value)) return value.map((item) => inject(item, vars))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, inject(item, vars)]),
    )
  }
  return value
}

/**
 * ComfyUI 适配器：使用一份导出的 API 格式 workflow JSON（含 {{prompt}} 等占位符）。
 * 提交：POST /prompt；轮询：GET /history/:prompt_id；图片：GET /view。
 */
export class ComfyUIProvider extends BaseImageProvider {
  readonly id = 'comfyui' as const

  private get baseUrl() {
    return (process.env.COMFYUI_BASE_URL?.trim() || 'http://127.0.0.1:8188').replace(/\/+$/, '')
  }

  isConfigured(): boolean {
    return Boolean(process.env.COMFYUI_BASE_URL?.trim() && process.env.COMFYUI_WORKFLOW_PATH?.trim())
  }

  supports(_kind: ImageGenerationKind): boolean {
    return true
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const key = process.env.COMFYUI_API_KEY?.trim()
    if (key) headers.Authorization = `Bearer ${key}`
    return headers
  }

  private async workflow(request: ProviderRequest): Promise<Record<string, unknown>> {
    const file = this.requireEnv('COMFYUI_WORKFLOW_PATH')
    const raw = await readFile(path.resolve(file), 'utf8').catch(() => {
      throw new ProviderError('WORKFLOW_MISSING', `无法读取 ComfyUI workflow: ${file}`, {
        retryable: false,
      })
    })
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new ProviderError('WORKFLOW_INVALID', 'ComfyUI workflow 不是合法 JSON', {
        retryable: false,
      })
    }

    return inject(parsed, {
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      width: request.width,
      height: request.height,
      seed: request.seed,
      image_url: request.userPhotoUrl ?? '',
      clothing_image_url: request.clothingImageUrls[0] ?? '',
      clothing_image_urls: request.clothingImageUrls.join(','),
    }) as Record<string, unknown>
  }

  async submit(request: ProviderRequest): Promise<ProviderSubmit> {
    const prompt = await this.workflow(request)
    const data = await this.fetchJson<ComfyPromptResponse>(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ prompt, client_id: `ootd-${Date.now()}` }),
    })

    if (!data.prompt_id) {
      throw new ProviderError('PROVIDER_BAD_RESPONSE', 'ComfyUI 未返回 prompt_id', {
        retryable: true,
      })
    }

    return { jobId: data.prompt_id, status: 'queued', progress: 5, raw: data }
  }

  async poll(jobId: string): Promise<ProviderPoll> {
    const history = await this.fetchJson<Record<string, ComfyHistoryEntry>>(
      `${this.baseUrl}/history/${jobId}`,
      { headers: this.headers() },
    )
    const entry = history[jobId]
    if (!entry) return { status: 'processing', progress: 40 }

    if (entry.status?.status_str === 'error') {
      return {
        status: 'failed',
        error: { code: 'PROVIDER_FAILED', message: 'ComfyUI 执行失败', retryable: true },
      }
    }

    const images = Object.values(entry.outputs ?? {}).flatMap((output) => output.images ?? [])
    const image = images[0]
    if (!image) return { status: 'processing', progress: 70 }

    const query = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder ?? '',
      type: image.type ?? 'output',
    })

    return {
      status: 'succeeded',
      progress: 100,
      imageUrl: `${this.baseUrl}/view?${query.toString()}`,
    }
  }
}
