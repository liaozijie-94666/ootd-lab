import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { getProfile } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    return ok(await getProfile(user, id))
  })
}
