import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { addComment, listComments } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const data = await listComments(
      user.id,
      id,
      Number(searchParams.get('page') ?? 1),
      Number(searchParams.get('limit') ?? 10),
    )
    return ok(data)
  })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`comment:create:${user.id}`, 30, 60 * 60_000)
    const { id } = await context.params
    const body = await request.json()
    const comment = await addComment(user, id, {
      ...body,
      content: body.content ?? body.body,
    })
    return ok({ comment }, 201)
  })
}
