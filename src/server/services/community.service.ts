import crypto from 'node:crypto'
import { z } from 'zod'
import sharp from 'sharp'
import type { Prisma, User } from '@prisma/client'
import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import { copyMediaToPublic, mediaUrl, saveMedia } from '@/server/media'
import { CATEGORY_LABEL, COLOR_HEX } from '@/lib/taxonomy'
import { excerpt, moderateImages, moderateText } from '@/server/services/moderation.service'
import { writeAudit } from '@/server/audit'
import type {
  CommunityAuthor,
  CommunityComment,
  CommunityFeedResponse,
  CommunityOutfitItem,
  CommunityPostCard,
  CommunityPostDetail,
  CommunityProfileResponse,
  CommunityTag,
} from '@/types/community'
import type { ClothingCategory, ClothingColor } from '@/types/studio'
import type { RecommendedItem } from '@/server/ai/types'

type Viewer = Pick<User, 'id' | 'role'>

const PAGE_SIZE = 12

const authorSelect = { id: true, name: true, handle: true, image: true } satisfies Prisma.UserSelect

const cardInclude = {
  author: { select: authorSelect },
  coverImage: true,
  tags: { include: { tag: true } },
} satisfies Prisma.PostInclude

const detailInclude = {
  author: { select: authorSelect },
  coverImage: true,
  images: { include: { media: true }, orderBy: { position: 'asc' } },
  tags: { include: { tag: true } },
  outfit: {
    include: {
      items: {
        include: {
          garment: {
            include: { brand: true, cutout: true, image: true },
          },
        },
        orderBy: { zIndex: 'asc' },
      },
    },
  },
  recommendation: true,
} satisfies Prisma.PostInclude

type CardRow = Prisma.PostGetPayload<{ include: typeof cardInclude }>
type DetailRow = Prisma.PostGetPayload<{ include: typeof detailInclude }>

function toAuthor(user: { id: string; name: string | null; handle: string; image: string | null }): CommunityAuthor {
  return {
    id: user.id,
    name: user.name ?? user.handle,
    handle: user.handle,
    avatarUrl: user.image,
  }
}

function tagsOf(post: CardRow | DetailRow): CommunityTag[] {
  return post.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, slug: tag.slug }))
}

function toCard(post: CardRow, liked: boolean, favorited: boolean): CommunityPostCard {
  return {
    id: post.id,
    title: post.title,
    excerpt: excerpt(post.body),
    coverUrl: mediaUrl(post.coverImageId),
    author: toAuthor(post.author),
    tags: tagsOf(post),
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    bookmarkCount: post.bookmarkCount,
    liked,
    favorited,
    status: post.status,
    createdAt: (post.publishedAt ?? post.createdAt).toISOString(),
  }
}

function mapOutfitItem(item: {
  garment: {
    name: string
    category: string
    colors: string[]
    primaryColorHex: string | null
    materials: string[]
    priceCents: number | null
    purchaseUrl: string | null
    cutoutId: string | null
    imageId: string | null
    brand: { name: string } | null
  }
  reason: string | null
}): CommunityOutfitItem {
  const garment = item.garment
  const color = (garment.colors[0] ?? 'MULTI') as ClothingColor
  return {
    name: garment.name,
    category: garment.category as ClothingCategory,
    categoryLabel: CATEGORY_LABEL[garment.category as ClothingCategory],
    color,
    colorHex: garment.primaryColorHex ?? COLOR_HEX[color],
    material: garment.materials[0] ?? null,
    brand: garment.brand?.name ?? null,
    price: garment.priceCents == null ? null : Math.round(garment.priceCents / 100),
    imageUrl: mediaUrl(garment.cutoutId ?? garment.imageId),
    purchaseUrl: garment.purchaseUrl,
    reason: item.reason,
  }
}

function mapRecommendationItems(raw: unknown): CommunityOutfitItem[] {
  if (!Array.isArray(raw)) return []
  return (raw as RecommendedItem[]).map((item) => ({
    name: item.name,
    category: item.category,
    categoryLabel: CATEGORY_LABEL[item.category],
    color: item.color,
    colorHex: item.colorHex,
    material: item.material,
    brand: item.brand,
    price: item.price,
    imageUrl: item.imageUrl,
    purchaseUrl: item.purchaseUrl,
    reason: item.reason,
  }))
}

async function likedSet(viewerId: string, postIds: string[]) {
  if (postIds.length === 0) return new Set<string>()
  const rows = await prisma.postLike.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  })
  return new Set(rows.map((row) => row.postId))
}

async function bookmarkSet(viewerId: string, postIds: string[]) {
  if (postIds.length === 0) return new Set<string>()
  const rows = await prisma.postBookmark.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  })
  return new Set(rows.map((row) => row.postId))
}

function hotScoreOf(like: number, comment: number, bookmark: number, publishedAt: Date | null): number {
  const hours = (Date.now() - (publishedAt?.getTime() ?? Date.now())) / 3_600_000
  return Number(((like * 3 + comment * 5 + bookmark * 4) / Math.pow(hours + 2, 1.5)).toFixed(4))
}

export async function recomputeHotScore(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { likeCount: true, commentCount: true, bookmarkCount: true, publishedAt: true, createdAt: true },
  })
  if (!post) return
  const score = hotScoreOf(
    post.likeCount,
    post.commentCount,
    post.bookmarkCount,
    post.publishedAt ?? post.createdAt,
  )
  await prisma.post.update({ where: { id: postId }, data: { hotScore: score } })
}

export interface ListPostsParams {
  sort?: 'latest' | 'hot' | 'following'
  tag?: string
  q?: string
  page?: number
  limit?: number
}

export async function listPosts(viewerId: string, params: ListPostsParams): Promise<CommunityFeedResponse> {
  const page = Math.max(1, Math.floor(params.page ?? 1))
  const limit = Math.min(30, Math.max(1, Math.floor(params.limit ?? PAGE_SIZE)))
  const sort = params.sort ?? 'latest'

  const where: Prisma.PostWhereInput = {
    status: 'PUBLISHED',
    deletedAt: null,
  }

  if (params.q?.trim()) {
    const q = params.q.trim()
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { body: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (params.tag) {
    where.tags = {
      some: { tag: { OR: [{ slug: params.tag }, { name: params.tag }] } },
    }
  }

  if (sort === 'following') {
    const follows = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    })
    const ids = follows.map((row) => row.followingId)
    if (ids.length === 0) {
      return { items: [], page, total: 0, hasMore: false }
    }
    where.authorId = { in: ids }
  }

  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    sort === 'hot'
      ? [{ hotScore: 'desc' }, { publishedAt: 'desc' }]
      : [{ publishedAt: 'desc' }, { createdAt: 'desc' }]

  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      include: cardInclude,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const ids = rows.map((row) => row.id)
  const [liked, favorited] = await Promise.all([likedSet(viewerId, ids), bookmarkSet(viewerId, ids)])

  return {
    items: rows.map((row) => toCard(row, liked.has(row.id), favorited.has(row.id))),
    page,
    total,
    hasMore: page * limit < total,
  }
}

export async function getPostDetail(viewer: Viewer, postId: string): Promise<CommunityPostDetail> {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    include: detailInclude,
  })
  if (!post) throw new ApiError('NOT_FOUND', '帖子不存在', 404)

  const isAuthor = post.authorId === viewer.id
  const isAdmin = viewer.role === 'ADMIN'
  if (post.status !== 'PUBLISHED' && !isAuthor && !isAdmin) {
    throw new ApiError('NOT_FOUND', '帖子不存在或已被下架', 404)
  }

  const [liked, favorited, following] = await Promise.all([
    prisma.postLike.findUnique({ where: { postId_userId: { postId, userId: viewer.id } } }),
    prisma.postBookmark.findUnique({ where: { postId_userId: { postId, userId: viewer.id } } }),
    post.authorId === viewer.id
      ? Promise.resolve(null)
      : prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewer.id, followingId: post.authorId } },
        }),
  ])

  const outfit = post.outfit
    ? {
        id: post.outfit.id,
        title: post.outfit.title,
        items: post.outfit.items.map(mapOutfitItem),
      }
    : null

  const recommendation = post.recommendation
    ? {
        id: post.recommendation.id,
        styleSummary: post.recommendation.styleTitle ?? 'AI 推荐',
        reason: post.recommendation.rationale ?? '',
        items: mapRecommendationItems(post.recommendation.itemsJson),
      }
    : null

  return {
    ...toCard(post, Boolean(liked), Boolean(favorited)),
    content: post.body,
    images: post.images.map((image) => ({
      id: image.media.id,
      url: mediaUrl(image.media.id) as string,
      width: image.media.width,
      height: image.media.height,
    })),
    isAuthor,
    followingAuthor: Boolean(following),
    outfit,
    recommendation,
  }
}

function slugOf(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (ascii.length >= 2) return ascii.slice(0, 40)
  return `tag-${crypto.createHash('sha1').update(name).digest('hex').slice(0, 10)}`
}

async function resolveTags(names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, 5)
  const ids: string[] = []
  for (const name of unique) {
    const tag = await prisma.tag.upsert({
      where: { slug: slugOf(name) },
      update: { usageCount: { increment: 1 } },
      create: { name: name.slice(0, 20), slug: slugOf(name), kind: 'GENERAL', usageCount: 1 },
    })
    ids.push(tag.id)
  }
  return ids
}

const createPostSchema = z.object({
  title: z.string().trim().min(5, '标题至少 5 个字').max(80, '标题最多 80 字'),
  content: z.string().trim().min(1, '正文不能为空').max(5000, '正文最多 5000 字'),
  imageIds: z.array(z.string()).max(9, '最多 9 张图片').default([]),
  tags: z.array(z.string()).max(5, '最多 5 个标签').default([]),
  outfitId: z.string().min(1).optional().nullable(),
  recommendationId: z.string().min(1).optional().nullable(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>

async function validateImages(userId: string, imageIds: string[]) {
  if (imageIds.length === 0) return []
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: imageIds }, ownerId: userId, kind: 'POST_IMAGE', status: 'READY' },
  })
  if (assets.length !== imageIds.length) {
    throw new ApiError('INVALID_IMAGES', '部分图片不存在或无权使用', 422)
  }
  return imageIds
}

export async function createPost(viewer: Viewer, raw: unknown): Promise<CommunityPostDetail> {
  const input = createPostSchema.parse(raw) as CreatePostInput

  let coverImageId: string | null = null
  let outfitId = input.outfitId ?? null
  let recommendationId = input.recommendationId ?? null

  if (outfitId) {
    const outfit = await prisma.outfit.findFirst({ where: { id: outfitId, deletedAt: null } })
    if (!outfit) throw new ApiError('NOT_FOUND', '关联的搭配方案不存在', 404)
    if (outfit.ownerId !== viewer.id && outfit.visibility !== 'PUBLIC') {
      throw new ApiError('FORBIDDEN', '无权关联该搭配方案', 403)
    }
    coverImageId = outfit.resultImageId ?? outfit.coverImageId
  }

  if (recommendationId) {
    const recommendation = await prisma.recommendation.findFirst({
      where: { id: recommendationId, userId: viewer.id },
    })
    if (!recommendation) throw new ApiError('NOT_FOUND', '关联的 AI 推荐不存在', 404)
    outfitId = outfitId ?? recommendation.outfitId
    coverImageId = coverImageId ?? recommendation.resultImageId
  }

  const imageIds = await validateImages(viewer.id, input.imageIds)
  if (imageIds.length > 0) coverImageId = imageIds[0]

  // 分享方案/推荐时，私有结果不能直接挂到公开帖：复制成公开副本
  if (coverImageId) {
    coverImageId = await copyMediaToPublic(coverImageId, viewer.id)
  }

  const text = await moderateText(input.title, input.content)
  if (text.decision === 'BLOCK') {
    throw new ApiError('CONTENT_BLOCKED', '内容包含敏感词，请修改后再发布', 422, {
      matches: text.matches,
    })
  }
  const imageAudit = await moderateImages(imageIds)
  const needsReview = text.decision === 'REVIEW' || imageAudit.decision === 'REVIEW'
  const status = needsReview ? 'PENDING_REVIEW' : 'PUBLISHED'

  const tagIds = await resolveTags(input.tags)

  const post = await prisma.post.create({
    data: {
      authorId: viewer.id,
      title: input.title,
      body: input.content,
      coverImageId,
      outfitId,
      recommendationId,
      status,
      moderationStatus: needsReview ? 'NEEDS_REVIEW' : 'APPROVED',
      publishedAt: needsReview ? null : new Date(),
      images: {
        create: imageIds.map((mediaId, position) => ({ mediaId, position })),
      },
      tags: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    },
  })

  await recomputeHotScore(post.id)

  if (outfitId || recommendationId) {
    await writeAudit({
      actorId: viewer.id,
      action: 'POST_SHARE',
      targetType: 'POST',
      targetId: post.id,
      meta: { outfitId, recommendationId, coverImageId },
    })
  }

  return getPostDetail(viewer, post.id)
}

const updatePostSchema = z.object({
  title: z.string().trim().min(5).max(80).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
  imageIds: z.array(z.string()).max(9).optional(),
  tags: z.array(z.string()).max(5).optional(),
})

export async function updatePost(viewer: Viewer, postId: string, raw: unknown): Promise<CommunityPostDetail> {
  const input = updatePostSchema.parse(raw)
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } })
  if (!post) throw new ApiError('NOT_FOUND', '帖子不存在', 404)
  if (post.authorId !== viewer.id && viewer.role !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', '只能编辑自己的帖子', 403)
  }
  if (post.status === 'REMOVED') {
    throw new ApiError('POST_REMOVED', '帖子已被下架，无法编辑', 422)
  }

  let status = post.status
  let moderationStatus = post.moderationStatus

  if (input.title || input.content) {
    const text = await moderateText(input.title ?? post.title, input.content ?? post.body)
    if (text.decision === 'BLOCK') {
      throw new ApiError('CONTENT_BLOCKED', '内容包含敏感词，请修改后再保存', 422, {
        matches: text.matches,
      })
    }
    status = text.decision === 'REVIEW' ? 'PENDING_REVIEW' : 'PUBLISHED'
    moderationStatus = text.decision === 'REVIEW' ? 'NEEDS_REVIEW' : 'APPROVED'
  }

  let imageIds: string[] | null = null
  if (input.imageIds) {
    imageIds = await validateImages(viewer.id, input.imageIds)
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.content ? { body: input.content } : {}),
      ...(input.title || input.content
        ? { status, moderationStatus, publishedAt: status === 'PUBLISHED' ? post.publishedAt ?? new Date() : null }
        : {}),
      ...(imageIds
        ? {
            coverImageId: imageIds[0] ?? post.coverImageId,
            images: { deleteMany: {}, create: imageIds.map((mediaId, position) => ({ mediaId, position })) },
          }
        : {}),
    },
  })

  if (input.tags) {
    const tagIds = await resolveTags(input.tags)
    await prisma.postTag.deleteMany({ where: { postId } })
    for (const tagId of tagIds) {
      await prisma.postTag.create({ data: { postId, tagId } })
    }
  }

  await recomputeHotScore(updated.id)
  return getPostDetail(viewer, postId)
}

export async function deletePost(viewer: Viewer, postId: string): Promise<{ deleted: boolean }> {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } })
  if (!post) throw new ApiError('NOT_FOUND', '帖子不存在', 404)
  if (post.authorId !== viewer.id && viewer.role !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', '只能删除自己的帖子', 403)
  }
  await prisma.post.update({
    where: { id: postId },
    data: { status: 'DELETED', deletedAt: new Date() },
  })
  return { deleted: true }
}

export async function toggleLike(viewerId: string, postId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null } })
  if (!post) throw new ApiError('NOT_FOUND', '帖子不存在', 404)

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId: viewerId } },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.postLike.delete({ where: { postId_userId: { postId, userId: viewerId } } }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ])
  } else {
    await prisma.$transaction([
      prisma.postLike.create({ data: { postId, userId: viewerId } }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ])
  }

  await recomputeHotScore(postId)
  const fresh = await prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } })

  return { liked: !existing, likeCount: Math.max(0, fresh?.likeCount ?? 0) }
}

export async function toggleFavorite(viewerId: string, postId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null } })
  if (!post) throw new ApiError('NOT_FOUND', '帖子不存在', 404)

  const existing = await prisma.postBookmark.findUnique({
    where: { postId_userId: { postId, userId: viewerId } },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.postBookmark.delete({ where: { postId_userId: { postId, userId: viewerId } } }),
      prisma.post.update({ where: { id: postId }, data: { bookmarkCount: { decrement: 1 } } }),
    ])
  } else {
    await prisma.$transaction([
      prisma.postBookmark.create({ data: { postId, userId: viewerId } }),
      prisma.post.update({ where: { id: postId }, data: { bookmarkCount: { increment: 1 } } }),
    ])
  }

  await recomputeHotScore(postId)
  const fresh = await prisma.post.findUnique({ where: { id: postId }, select: { bookmarkCount: true } })
  return { favorited: !existing, bookmarkCount: Math.max(0, fresh?.bookmarkCount ?? 0) }
}

export async function listComments(
  viewerId: string,
  postId: string,
  page = 1,
  limit = 10,
): Promise<{ items: CommunityComment[]; page: number; hasMore: boolean; total: number }> {
  const currentPage = Math.max(1, Math.floor(page))
  const take = Math.min(30, Math.max(1, Math.floor(limit)))

  const [total, rows] = await Promise.all([
    prisma.comment.count({ where: { postId, parentId: null, status: 'PUBLISHED' } }),
    prisma.comment.findMany({
      where: { postId, parentId: null, status: 'PUBLISHED' },
      include: {
        author: { select: authorSelect },
        replies: {
          where: { status: 'PUBLISHED' },
          include: { author: { select: authorSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip: (currentPage - 1) * take,
      take,
    }),
  ])

  const items: CommunityComment[] = rows.map((row) => ({
    id: row.id,
    content: row.body,
    parentId: row.parentId,
    author: toAuthor(row.author),
    likeCount: row.likeCount,
    createdAt: row.createdAt.toISOString(),
    isAuthor: row.authorId === viewerId,
    replies: row.replies.map((reply) => ({
      id: reply.id,
      content: reply.body,
      parentId: reply.parentId,
      author: toAuthor(reply.author),
      likeCount: reply.likeCount,
      createdAt: reply.createdAt.toISOString(),
      isAuthor: reply.authorId === viewerId,
      replies: [],
    })),
  }))

  return { items, page: currentPage, hasMore: currentPage * take < total, total }
}

const commentSchema = z.object({
  content: z.string().trim().min(1, '写点什么吧').max(500, '评论最多 500 字'),
  parentId: z.string().min(1).optional().nullable(),
})

export async function addComment(viewer: Viewer, postId: string, raw: unknown): Promise<CommunityComment> {
  const input = commentSchema.parse(raw)
  const post = await prisma.post.findFirst({ where: { id: postId, status: 'PUBLISHED', deletedAt: null } })
  if (!post) throw new ApiError('NOT_FOUND', '帖子不存在或不可评论', 404)

  if (input.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: input.parentId, postId, status: 'PUBLISHED' },
    })
    if (!parent) throw new ApiError('NOT_FOUND', '回复的评论不存在', 404)
    if (parent.parentId) throw new ApiError('NESTED_TOO_DEEP', '仅支持一级回复', 422)
  }

  const text = await moderateText(input.content)
  if (text.decision === 'BLOCK') {
    throw new ApiError('CONTENT_BLOCKED', '评论包含敏感词', 422, { matches: text.matches })
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: viewer.id,
      parentId: input.parentId ?? null,
      body: input.content,
      status: 'PUBLISHED',
    },
    include: { author: { select: authorSelect } },
  })

  await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } })
  await recomputeHotScore(postId)

  if (post.authorId !== viewer.id) {
    await prisma.notification.create({
      data: {
        recipientId: post.authorId,
        actorId: viewer.id,
        type: 'COMMENT',
        entityType: 'POST',
        entityId: postId,
        payload: { excerpt: input.content.slice(0, 60) },
      },
    })
  }

  return {
    id: comment.id,
    content: comment.body,
    parentId: comment.parentId,
    author: toAuthor(comment.author),
    likeCount: 0,
    createdAt: comment.createdAt.toISOString(),
    isAuthor: true,
    replies: [],
  }
}

export async function deleteComment(viewer: Viewer, commentId: string): Promise<{ deleted: boolean }> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { post: { select: { authorId: true } } },
  })
  if (!comment || comment.status === 'DELETED') {
    throw new ApiError('NOT_FOUND', '评论不存在', 404)
  }

  const allowed =
    comment.authorId === viewer.id || comment.post.authorId === viewer.id || viewer.role === 'ADMIN'
  if (!allowed) throw new ApiError('FORBIDDEN', '无权删除该评论', 403)

  await prisma.comment.update({
    where: { id: commentId },
    data: { status: 'DELETED', body: '该评论已删除' },
  })
  await prisma.post.update({
    where: { id: comment.postId },
    data: { commentCount: { decrement: 1 } },
  })
  await recomputeHotScore(comment.postId)
  return { deleted: true }
}

const reportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'USER']),
  targetId: z.string().min(1),
  reason: z.enum(['SEXUAL', 'ILLEGAL', 'VIOLENCE', 'COPYRIGHT', 'SPAM', 'HARASSMENT', 'OTHER']),
  detail: z.string().trim().max(500).optional(),
})

export async function reportContent(viewerId: string, raw: unknown) {
  const input = reportSchema.parse(raw)

  if (input.targetType === 'POST') {
    const target = await prisma.post.findFirst({ where: { id: input.targetId, deletedAt: null } })
    if (!target) throw new ApiError('NOT_FOUND', '举报的对象不存在', 404)
  } else if (input.targetType === 'COMMENT') {
    const target = await prisma.comment.findUnique({ where: { id: input.targetId } })
    if (!target) throw new ApiError('NOT_FOUND', '举报的对象不存在', 404)
  } else {
    const target = await prisma.user.findUnique({ where: { id: input.targetId } })
    if (!target) throw new ApiError('NOT_FOUND', '举报的对象不存在', 404)
  }

  const existing = await prisma.report.findFirst({
    where: {
      reporterId: viewerId,
      targetType: input.targetType,
      targetId: input.targetId,
      status: { in: ['OPEN', 'REVIEWING'] },
    },
  })
  if (existing) throw new ApiError('ALREADY_REPORTED', '你已经举报过了，我们正在处理', 409)

  const report = await prisma.report.create({
    data: {
      reporterId: viewerId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      detail: input.detail ?? null,
    },
  })

  return { id: report.id, status: report.status }
}

export async function getProfile(viewer: Viewer, userId: string): Promise<CommunityProfileResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      _count: {
        select: {
          posts: { where: { status: 'PUBLISHED', deletedAt: null } },
          followers: true,
          following: true,
          outfits: { where: { deletedAt: null } },
        },
      },
    },
  })
  if (!user) throw new ApiError('NOT_FOUND', '用户不存在', 404)

  const isSelf = user.id === viewer.id
  const isFollowing = isSelf
    ? false
    : Boolean(
        await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewer.id, followingId: userId } },
        }),
      )

  const [postRows, bookmarkRows, outfitRows] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId, status: 'PUBLISHED', deletedAt: null },
      include: cardInclude,
      orderBy: { publishedAt: 'desc' },
      take: 12,
    }),
    prisma.postBookmark.findMany({
      where: { userId },
      include: { post: { include: cardInclude } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.outfit.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        status: { in: ['SAVED', 'READY'] },
        ...(isSelf ? {} : { visibility: 'PUBLIC' }),
      },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ])

  const postIds = [...new Set([...postRows.map((row) => row.id), ...bookmarkRows.map((row) => row.postId)])]
  const [liked, favorited] = await Promise.all([likedSet(viewer.id, postIds), bookmarkSet(viewer.id, postIds)])

  return {
    user: {
      id: user.id,
      name: user.name ?? user.handle,
      handle: user.handle,
      avatarUrl: user.image,
      bio: user.profile?.bio ?? null,
      city: user.profile?.city ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    stats: {
      posts: user._count.posts,
      followers: user._count.followers,
      following: user._count.following,
      outfits: user._count.outfits,
    },
    isSelf,
    isFollowing,
    posts: postRows.map((row) => toCard(row, liked.has(row.id), favorited.has(row.id))),
    favorites: bookmarkRows
      .filter((row) => row.post.status === 'PUBLISHED')
      .map((row) => toCard(row.post, liked.has(row.postId), true)),
    outfits: outfitRows.map((outfit) => ({
      id: outfit.id,
      title: outfit.title,
      coverUrl: mediaUrl(outfit.coverImageId),
      itemCount: outfit._count.items,
      isPublic: outfit.visibility === 'PUBLIC',
    })),
  }
}

export async function toggleFollow(viewerId: string, targetId: string) {
  if (viewerId === targetId) throw new ApiError('INVALID_TARGET', '不能关注自己', 422)

  const target = await prisma.user.findUnique({ where: { id: targetId } })
  if (!target) throw new ApiError('NOT_FOUND', '用户不存在', 404)

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
  })

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } })
  } else {
    await prisma.follow.create({ data: { followerId: viewerId, followingId: targetId } })
    await prisma.notification.create({
      data: {
        recipientId: targetId,
        actorId: viewerId,
        type: 'FOLLOW',
        entityType: 'USER',
        entityId: viewerId,
      },
    })
  }

  const followers = await prisma.follow.count({ where: { followingId: targetId } })
  return { following: !existing, followers }
}

export async function listPopularTags(limit = 12) {
  const tags = await prisma.tag.findMany({
    orderBy: [{ usageCount: 'desc' }, { createdAt: 'asc' }],
    take: Math.min(30, limit),
  })
  return tags.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug, count: tag.usageCount }))
}

export async function uploadPostImages(form: FormData, userId: string) {
  const files = form.getAll('files').filter((value): value is File => value instanceof File)
  if (files.length === 0) throw new ApiError('VALIDATION_ERROR', '请选择图片', 400)
  if (files.length > 9) throw new ApiError('TOO_MANY_IMAGES', '最多上传 9 张图片', 422)

  const images: Array<{ id: string; url: string }> = []

  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      throw new ApiError('FILE_TOO_LARGE', '单张图片不能超过 10MB', 413)
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    let meta
    try {
      meta = await sharp(buffer).metadata()
    } catch {
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE', '文件不是有效图片', 415)
    }
    if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) {
      throw new ApiError('UNSUPPORTED_MEDIA_TYPE', '仅支持 JPG / PNG / WebP', 415)
    }

    const normalized = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer()

    const asset = await saveMedia({
      ownerId: userId,
      kind: 'POST_IMAGE',
      buffer: normalized,
      mimeType: 'image/jpeg',
      width: (await sharp(normalized).metadata()).width,
      height: (await sharp(normalized).metadata()).height,
      visibility: 'PUBLIC',
    })

    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { moderationStatus: 'APPROVED' },
    })

    images.push({ id: asset.id, url: mediaUrl(asset.id) as string })
  }

  return { images }
}

export async function takedownPost(admin: Viewer, postId: string, reason: string) {
  if (admin.role !== 'ADMIN') throw new ApiError('FORBIDDEN', '需要管理员权限', 403)
  const post = await prisma.post.findFirst({ where: { id: postId } })
  if (!post) throw new ApiError('NOT_FOUND', '帖子不存在', 404)

  await prisma.post.update({
    where: { id: postId },
    data: { status: 'REMOVED', moderationStatus: 'REJECTED' },
  })

  await prisma.notification.create({
    data: {
      recipientId: post.authorId,
      actorId: admin.id,
      type: 'MODERATION',
      entityType: 'POST',
      entityId: postId,
      payload: { reason, action: 'REMOVED' },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'POST_TAKEDOWN',
      targetType: 'POST',
      targetId: postId,
      meta: { reason },
    },
  })

  return { removed: true }
}
