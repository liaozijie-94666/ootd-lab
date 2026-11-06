import { withApi, ok, fail } from '@/server/http'
import { requireUser } from '@/server/auth'
import { getTaskForUser } from '@/server/services/tryon.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    const task = await getTaskForUser(user.id, id)
    return ok(task)
  })
}

export async function OPTIONS() {
  return fail('METHOD_NOT_ALLOWED', '不支持的方法', 405)
}
