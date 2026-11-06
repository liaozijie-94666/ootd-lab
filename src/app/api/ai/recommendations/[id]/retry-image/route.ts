import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { retryRecommendationImage } from '@/server/services/recommendation.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`ai:retry-image:${user.id}`, 20, 60 * 60_000)
    const { id } = await context.params
    return ok(await retryRecommendationImage(user.id, id))
  })
}
