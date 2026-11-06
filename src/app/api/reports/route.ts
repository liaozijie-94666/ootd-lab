import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { reportContent } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`report:${user.id}`, 20, 24 * 60 * 60_000)
    const body = await request.json()
    return ok(await reportContent(user.id, body), 201)
  })
}
