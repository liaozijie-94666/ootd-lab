import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { uploadPostImages } from '@/server/services/community.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`community:image:${user.id}`, 30, 60 * 60_000)
    const form = await request.formData()
    return ok(await uploadPostImages(form, user.id), 201)
  })
}
