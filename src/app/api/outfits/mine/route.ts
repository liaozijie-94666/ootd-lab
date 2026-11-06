import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { listMyOutfits } from '@/server/services/outfit.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    const items = await listMyOutfits(user.id)
    return ok({ items })
  })
}
