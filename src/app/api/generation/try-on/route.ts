import { withApi, ok, ApiError } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { createTryOn } from '@/server/services/tryon.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`tryon:${user.id}`, 10, 60 * 60_000)
    const body = await request.json().catch(() => {
      throw new ApiError('VALIDATION_ERROR', '请求体不是合法的 JSON', 400)
    })
    const result = await createTryOn(user.id, body)
    return ok(result, 202)
  })
}
