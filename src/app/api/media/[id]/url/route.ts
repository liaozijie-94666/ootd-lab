import { requireUser } from '@/server/auth'
import { getOwnedMedia } from '@/server/media'
import { withApi, ok } from '@/server/http'
import { signedMediaUrl } from '@/server/media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 为私有媒体签发 10 分钟 URL；仅 owner 可获取。 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await context.params
    const asset = await getOwnedMedia(id, user.id)
    return ok({
      url: signedMediaUrl(asset.id, 600),
      expiresIn: 600,
      assetId: asset.id,
    })
  })
}
