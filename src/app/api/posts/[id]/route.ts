import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { deletePost, getPostDetail, updatePost } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    const post = await getPostDetail(user, id)
    return ok({ post })
  })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    const body = await request.json()
    const post = await updatePost(user, id, {
      ...body,
      content: body.content ?? body.body,
    })
    return ok({ post })
  })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    return ok(await deletePost(user, id))
  })
}
