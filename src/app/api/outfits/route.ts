import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { createOutfit } from '@/server/services/outfit.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`outfit:create:${user.id}`, 20, 24 * 60 * 60_000)
    const body = await request.json()
    const outfit = await createOutfit(user.id, body)
    return ok({ outfit }, 201)
  })
}
