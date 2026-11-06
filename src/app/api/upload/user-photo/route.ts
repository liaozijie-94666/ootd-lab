import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { uploadUserPhoto } from '@/server/services/upload.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`upload:photo:${user.id}`, 30, 60 * 60_000)
    const form = await request.formData()
    const result = await uploadUserPhoto(form, user.id)
    return ok(result, 201)
  })
}
