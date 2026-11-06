import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { listMyRecommendations } from '@/server/services/recommendation.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    return ok({ items: await listMyRecommendations(user.id) })
  })
}
