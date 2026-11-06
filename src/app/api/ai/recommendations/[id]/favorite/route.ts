import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { toggleFavorite } from '@/server/services/recommendation.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    return ok(await toggleFavorite(user.id, id))
  })
}
