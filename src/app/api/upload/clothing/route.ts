import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { uploadUserClothing } from '@/server/services/upload.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`upload:clothing:${user.id}`, 30, 60 * 60_000)
    const form = await request.formData()
    const item = await uploadUserClothing(form, user.id)
    return ok({ item }, 201)
  })
}
