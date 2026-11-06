import { withApi, ok, ApiError } from '@/server/http'
import { requireUser } from '@/server/auth'
import { imageGenerationService } from '@/server/ai/generation'
import { enforceRateLimit } from '@/server/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`imagegen:${user.id}`, 10, 60 * 60_000)
    const body = await request.json().catch(() => {
      throw new ApiError('VALIDATION_ERROR', '请求体不是合法的 JSON', 400)
    })

    const kind = body.kind === 'recommendation' ? 'recommendation' : body.kind === 'tryon' ? 'tryon' : null
    if (!kind) throw new ApiError('VALIDATION_ERROR', 'kind 必须是 tryon 或 recommendation', 400)

    const { kind: _kind, ...input } = body

    const result =
      kind === 'tryon'
        ? await imageGenerationService.generateTryOn({ ...input, userId: user.id })
        : await imageGenerationService.generateRecommendation({ ...input, userId: user.id })

    return ok(result, 201)
  })
}
