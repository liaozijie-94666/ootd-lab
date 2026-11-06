import type { StylistContext, StylistDraft, StylistProvider, StylistResult } from '@/server/ai/types'
import { AI_DRAFT_SCHEMA, normalizeDraft } from '@/server/ai/schema'
import { MockStylistProvider } from '@/server/ai/mock-stylist'
import { OpenAICompatibleStylist } from '@/server/ai/openai-stylist'
import type { ZodError } from 'zod'

function selectProvider(): StylistProvider {
  if (process.env.LLM_PROVIDER === 'mock') return new MockStylistProvider()
  const llm = new OpenAICompatibleStylist()
  return llm.isConfigured() ? llm : new MockStylistProvider()
}

function issuesOf(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as ZodError
    return zodError.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .slice(0, 8)
      .join('; ')
  }
  return error instanceof Error ? error.message.slice(0, 300) : 'unknown error'
}

/**
 * 调用造型 Provider：JSON Schema 校验 → 失败带错误重试一次 → 仍失败降级到规则引擎。
 * 永远不把异常抛给调用方（除非规则引擎也失败）。
 */
export async function generateStylistDraft(
  context: StylistContext,
  providerOverride?: StylistProvider,
): Promise<StylistResult> {
  const provider = providerOverride ?? selectProvider()
  const started = Date.now()
  let lastIssues = ''

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await provider.generate({
        ...context,
        repairHint: attempt > 0 ? lastIssues : undefined,
      })
      const validated = AI_DRAFT_SCHEMA.parse(raw)
      const items = normalizeDraft(validated as StylistDraft, context)

      return {
        draft: validated as StylistDraft,
        items,
        provider: provider.id,
        model: provider.model,
        latencyMs: Date.now() - started,
        retried: attempt > 0,
      }
    } catch (error) {
      lastIssues = issuesOf(error)
      console.warn(`[stylist] ${provider.id} attempt ${attempt + 1} failed: ${lastIssues}`)
    }
  }

  const fallback = new MockStylistProvider()
  const draft = await fallback.generate(context)
  const items = normalizeDraft(draft, context)

  return {
    draft,
    items,
    provider: 'rule-fallback',
    model: fallback.model,
    latencyMs: Date.now() - started,
    retried: true,
  }
}

export function stylistProviderInfo() {
  const provider = selectProvider()
  return {
    provider: provider.id,
    model: provider.model,
    configured: provider.isConfigured(),
  }
}
