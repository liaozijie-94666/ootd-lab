import { compare } from 'bcryptjs'
import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import { storage } from '@/server/storage'
import { softDeleteMedia } from '@/server/media'
import { writeAudit } from '@/server/audit'

async function removeFiles(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map((key) => storage.remove(key).catch((error) => console.warn('[privacy] 文件清理失败', key, error))),
  )
}

export async function deleteResultMedia(userId: string, mediaId: string): Promise<void> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, ownerId: userId, status: 'READY', deletedAt: null },
  })
  if (!asset) throw new ApiError('NOT_FOUND', '图片不存在', 404)
  if (asset.kind !== 'RESULT') {
    throw new ApiError('MEDIA_KIND_NOT_ALLOWED', '该接口仅用于删除生成结果；照片请在隐私中心删除', 422)
  }

  await softDeleteMedia(asset.id, userId)
  await Promise.all([
    prisma.outfit.updateMany({
      where: { ownerId: userId, resultImageId: asset.id },
      data: { resultImageId: null },
    }),
    prisma.outfit.updateMany({
      where: { ownerId: userId, coverImageId: asset.id },
      data: { coverImageId: null },
    }),
    prisma.recommendation.updateMany({
      where: { userId, resultImageId: asset.id },
      data: { resultImageId: null },
    }),
  ])

  await writeAudit({
    actorId: userId,
    action: 'MEDIA_DELETE',
    targetType: 'MEDIA',
    targetId: asset.id,
  })
}

export async function revokeConsent(userId: string, consentId?: string): Promise<{ revoked: number; mediaDeleted: number }> {
  const consents = await prisma.consent.findMany({
    where: {
      userId,
      granted: true,
      ...(consentId ? { id: consentId } : {}),
      type: { in: ['FACE_IMAGE_PROCESSING', 'FULL_BODY_PROCESSING'] },
    },
  })
  if (consents.length === 0) throw new ApiError('NOT_FOUND', '没有可撤回的授权', 404)

  const mediaIds = consents.map((consent) => consent.mediaAssetId).filter((id): id is string => Boolean(id))
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: mediaIds }, ownerId: userId, deletedAt: null },
  })

  await prisma.consent.updateMany({
    where: { id: { in: consents.map((consent) => consent.id) } },
    data: { granted: false, revokedAt: new Date() },
  })

  for (const asset of assets) {
    await softDeleteMedia(asset.id, userId)
  }

  await writeAudit({
    actorId: userId,
    action: 'CONSENT_REVOKE',
    targetType: 'CONSENT',
    targetId: consentId ?? 'all',
    meta: { revoked: consents.length, mediaDeleted: assets.length },
  })

  return { revoked: consents.length, mediaDeleted: assets.length }
}

export interface UserDataExport {
  exportedAt: string
  user: Record<string, unknown>
  consents: unknown[]
  outfits: unknown[]
  recommendations: unknown[]
  posts: unknown[]
  comments: unknown[]
}

export async function exportUserData(userId: string): Promise<UserDataExport> {
  const [user, consents, outfits, recommendations, posts, comments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        handle: true,
        createdAt: true,
        profile: true,
      },
    }),
    prisma.consent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.outfit.findMany({
      where: { ownerId: userId, deletedAt: null },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.recommendation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        sceneText: true,
        styleTitle: true,
        rationale: true,
        status: true,
        itemsJson: true,
        createdAt: true,
      },
    }),
    prisma.post.findMany({
      where: { authorId: userId, deletedAt: null },
      select: { id: true, title: true, body: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comment.findMany({
      where: { authorId: userId, deletedAt: null },
      select: { id: true, postId: true, body: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!user) throw new ApiError('NOT_FOUND', '用户不存在', 404)

  await writeAudit({
    actorId: userId,
    action: 'DATA_EXPORT',
    targetType: 'USER',
    targetId: userId,
  })

  return {
    exportedAt: new Date().toISOString(),
    user: user as unknown as Record<string, unknown>,
    consents: consents as unknown[],
    outfits: outfits as unknown[],
    recommendations: recommendations as unknown[],
    posts: posts as unknown[],
    comments: comments as unknown[],
  }
}

export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new ApiError('NOT_FOUND', '用户不存在', 404)
  if (!user.passwordHash) throw new ApiError('PASSWORD_NOT_SET', '该账号不支持密码注销', 400)
  if (!(await compare(password, user.passwordHash))) {
    throw new ApiError('INVALID_PASSWORD', '密码错误', 403)
  }

  const media = await prisma.mediaAsset.findMany({
    where: { ownerId: userId, deletedAt: null },
    select: { id: true, storageKey: true },
  })

  await removeFiles(media.map((asset) => asset.storageKey))

  const now = new Date()
  await prisma.$transaction([
    prisma.mediaAsset.updateMany({
      where: { ownerId: userId },
      data: { status: 'DELETED', deletedAt: now },
    }),
    prisma.consent.updateMany({
      where: { userId },
      data: { granted: false, revokedAt: now },
    }),
    prisma.post.updateMany({
      where: { authorId: userId },
      data: { status: 'DELETED', deletedAt: now },
    }),
    prisma.comment.updateMany({
      where: { authorId: userId },
      data: { status: 'DELETED', deletedAt: now },
    }),
    prisma.outfit.updateMany({
      where: { ownerId: userId },
      data: { deletedAt: now },
    }),
    prisma.follow.deleteMany({
      where: { OR: [{ followerId: userId }, { followingId: userId }] },
    }),
    prisma.postLike.deleteMany({ where: { userId } }),
    prisma.commentLike.deleteMany({ where: { userId } }),
    prisma.postBookmark.deleteMany({ where: { userId } }),
    prisma.outfitFavorite.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({
      where: { OR: [{ recipientId: userId }, { actorId: userId }] },
    }),
    prisma.profile.updateMany({
      where: { userId },
      data: {
        displayName: '已注销用户',
        bio: null,
        heightCm: null,
        weightKg: null,
        bodyShape: null,
        city: null,
        stylePrefs: [],
        avoidedColors: [],
        isPublic: false,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: now,
        email: `deleted+${userId}@invalid.local`,
        handle: `deleted_${userId.slice(0, 8)}`,
        name: '已注销用户',
        image: null,
        passwordHash: null,
      },
    }),
  ])

  await writeAudit({
    actorId: userId,
    action: 'ACCOUNT_DELETE',
    targetType: 'USER',
    targetId: userId,
    meta: { mediaDeleted: media.length },
  })
}

export function exportFileName(userId: string): string {
  return `ootd-export-${userId.slice(0, 8)}.json`
}
