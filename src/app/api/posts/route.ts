import { withApi, ok, ApiError } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { createPost, listPosts } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const sortParam = searchParams.get('sort')
    const sort = sortParam === 'hot' || sortParam === 'following' ? sortParam : 'latest'

    const data = await listPosts(user.id, {
      sort,
      tag: searchParams.get('tag') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 12),
    })

    return ok(data)
  })
}

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`post:create:${user.id}`, 10, 24 * 60 * 60_000)
    const body = await request.json().catch(() => {
      throw new ApiError('VALIDATION_ERROR', '请求体不是合法的 JSON', 400)
    })

    // 兼容自由搭配 / AI 推荐模块的分享调用（body 字段）
    const normalized = {
      ...body,
      content: body.content ?? body.body,
    }

    const post = await createPost(user, normalized)
    return ok({ post }, 201)
  })
}
