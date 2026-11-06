import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { toggleFollow } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`follow:${user.id}`, 60, 60 * 60_000)
    const { id } = await context.params
    return ok(await toggleFollow(user.id, id))
  })
}
