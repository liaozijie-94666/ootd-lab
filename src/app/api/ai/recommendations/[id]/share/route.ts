import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { shareRecommendation } from '@/server/services/recommendation.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    return ok(await shareRecommendation(user.id, id, body), 201)
  })
}
