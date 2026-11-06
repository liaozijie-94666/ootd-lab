import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import { createPostSchema } from '@/server/validation'
import type { z } from 'zod'

type CreatePostInput = z.infer<typeof createPostSchema>

export async function shareOutfitToFeed(
  userId: string,
  raw: unknown,
): Promise<{ id: string; status: string }> {
  const input = createPostSchema.parse(raw) as CreatePostInput

  const outfit = await prisma.outfit.findFirst({
    where: { id: input.outfitId, ownerId: userId, deletedAt: null },
  })
  if (!outfit) {
    throw new ApiError('NOT_FOUND', '方案不存在或无权分享', 404)
  }
  if (!outfit.resultImageId) {
    throw new ApiError('OUTFIT_NOT_SHAREABLE', '请先生成效果图，再分享到讨论区', 422)
  }

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      title: input.title,
      body: input.body,
      coverImageId: outfit.coverImageId,
      outfitId: outfit.id,
      status: 'PUBLISHED',
      moderationStatus: 'APPROVED',
      publishedAt: new Date(),
    },
  })

  return { id: post.id, status: post.status }
}
