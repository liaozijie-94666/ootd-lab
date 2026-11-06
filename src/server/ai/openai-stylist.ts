import type { StylistContext, StylistDraft, StylistProvider } from '@/server/ai/types'
import { STYLIST_SYSTEM_PROMPT, buildRepairPrompt, buildUserPrompt } from '@/server/ai/prompt'
import { stripJsonFence } from '@/server/ai/schema'

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

/**
 * OpenAI 兼容 Chat Completions（DeepSeek / OpenAI / 通义 / 自建网关）。
 * 密钥只在此文件读取，绝不下发到客户端。
 */
export class OpenAICompatibleStylist implements StylistProvider {
  readonly id = 'llm'
  readonly model: string

  constructor() {
    this.model = process.env.LLM_MODEL?.trim() || 'deepseek-chat'
  }

  isConfigured(): boolean {
    return Boolean(process.env.LLM_API_KEY?.trim())
  }

  async generate(context: StylistContext): Promise<StylistDraft> {
    const apiKey = process.env.LLM_API_KEY?.trim()
    if (!apiKey) throw new Error('LLM_NOT_CONFIGURED')

    const baseUrl = (process.env.LLM_BASE_URL?.trim() || 'https://api.deepseek.com/v1').replace(/\/+$/, '')
    const messages = [
      { role: 'system', content: STYLIST_SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(context) },
    ]
    if (context.repairHint) {
      messages.push({ role: 'user', content: buildRepairPrompt(context.repairHint) })
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.75,
        max_tokens: 1400,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`LLM_HTTP_${response.status} ${detail.slice(0, 200)}`)
    }

    const payload = (await response.json()) as ChatCompletionResponse
    const content = payload.choices?.[0]?.message?.content
    if (!content) throw new Error('LLM_EMPTY_RESPONSE')

    return JSON.parse(stripJsonFence(content)) as StylistDraft
  }

  static repairMessage(errors: string) {
    return buildRepairPrompt(errors)
  }
}
