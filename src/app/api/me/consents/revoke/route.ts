import { z } from 'zod'
import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { enforceRateLimit } from '@/server/rate-limit'
import { revokeConsent } from '@/server/services/privacy.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ consentId: z.string().min(1).optional() })

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`consent:revoke:${user.id}`, 10, 24 * 60 * 60_000)
    const body = await request.json().catch(() => ({}))
    const input = schema.parse(body)
    return ok(await revokeConsent(user.id, input.consentId))
  })
}
