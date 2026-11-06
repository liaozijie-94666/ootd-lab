import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { prisma } from '@/server/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    const items = await prisma.consent.findMany({
      where: {
        userId: user.id,
        type: { in: ['FACE_IMAGE_PROCESSING', 'FULL_BODY_PROCESSING'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        granted: true,
        policyVersion: true,
        grantedAt: true,
        revokedAt: true,
        mediaAssetId: true,
      },
    })
    return ok({ items })
  })
}
