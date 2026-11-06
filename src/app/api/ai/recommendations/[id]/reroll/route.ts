import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { rerollRecommendation } from '@/server/services/recommendation.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`ai:reroll:${user.id}`, 20, 24 * 60 * 60_000)
    const { id } = await context.params
    return ok(await rerollRecommendation(user.id, id), 201)
  })
}
