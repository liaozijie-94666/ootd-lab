import { withApi, ok } from '@/server/http'
import { listPopularTags } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withApi(async () => {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') ?? 12)
    return ok({ items: await listPopularTags(Number.isFinite(limit) ? limit : 12) })
  })
}
