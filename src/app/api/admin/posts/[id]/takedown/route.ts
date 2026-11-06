import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { takedownPost } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    return ok(
      await takedownPost(user, id, String(body.reason ?? '违反社区规范').slice(0, 200)),
    )
  })
}
