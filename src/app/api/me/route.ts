import { z } from 'zod'
import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { deleteAccount } from '@/server/services/privacy.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  password: z.string().min(8).max(72),
  confirm: z.literal('DELETE'),
})

export async function DELETE(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`account:delete:${user.id}`, 3, 24 * 60 * 60_000)
    const body = await request.json().catch(() => ({}))
    const input = schema.parse(body)
    await deleteAccount(user.id, input.password)
    return ok({ deleted: true })
  })
}
