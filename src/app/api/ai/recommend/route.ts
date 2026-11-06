import { withApi, ok, ApiError } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { createRecommendation } from '@/server/services/recommendation.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`ai:recommend:${user.id}`, 20, 24 * 60 * 60_000)
    const body = await request.json().catch(() => {
      throw new ApiError('VALIDATION_ERROR', '请求体不是合法的 JSON', 400)
    })
    const result = await createRecommendation(user.id, body)
    return ok(result, 201)
  })
}
