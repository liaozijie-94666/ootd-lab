import { requireUser } from '@/server/auth'
import { getMediaAsset, getReadableMedia, readMediaBuffer, verifyMediaSignature } from '@/server/media'
import { withApi, ok } from '@/server/http'
import { enforceRateLimit } from '@/server/rate-limit'
import { deleteResultMedia } from '@/server/services/privacy.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const signed = verifyMediaSignature(id, searchParams.get('exp'), searchParams.get('sig'))

    const asset = signed ? await getMediaAsset(id) : await (async () => {
      const user = await requireUser()
      return getReadableMedia(id, user.id)
    })()

    const buffer = await readMediaBuffer(asset)
    const isPublic = asset.visibility === 'PUBLIC'
    const headers: Record<string, string> = {
      'Content-Type': asset.mimeType,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': isPublic ? 'public, max-age=31536000, immutable' : 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    }

    return new Response(new Uint8Array(buffer), { status: 200, headers })
  })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`media:delete:${user.id}`, 30, 24 * 60 * 60_000)
    const { id } = await context.params
    await deleteResultMedia(user.id, id)
    return ok({ deleted: true })
  })
}
