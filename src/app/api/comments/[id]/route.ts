import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { deleteComment } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    return ok(await deleteComment(user, id))
  })
}
