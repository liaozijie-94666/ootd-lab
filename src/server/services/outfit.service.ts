import type { Prisma, Slot } from '@prisma/client'
import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import { getOwnedMedia, mediaUrl } from '@/server/media'
import { saveOutfitSchema } from '@/server/validation'
import type { SavedOutfit } from '@/types/studio'
import type { z } from 'zod'

type SaveOutfitInput = z.infer<typeof saveOutfitSchema>

interface OutfitRow {
  id: string
  title: string
  visibility: string
  coverImageId: string | null
  resultImageId: string | null
  createdAt: Date
}

function toSavedOutfit(outfit: OutfitRow, clothingIds: string[]): SavedOutfit {
  return {
    id: outfit.id,
    title: outfit.title,
    coverUrl: mediaUrl(outfit.coverImageId),
    resultUrl: mediaUrl(outfit.resultImageId),
    isPublic: outfit.visibility === 'PUBLIC',
    itemCount: clothingIds.length,
    clothingIds,
    createdAt: outfit.createdAt.toISOString(),
  }
}

export async function createOutfit(userId: string, raw: unknown): Promise<SavedOutfit> {
  const input = saveOutfitSchema.parse(raw) as SaveOutfitInput

  const photo = await getOwnedMedia(input.userPhotoId, userId)
  const resultAsset = input.resultImageId ? await getOwnedMedia(input.resultImageId, userId) : null

  const clothingIds = [...new Set(input.layers.map((layer) => layer.clothingId))]
  const garments = await prisma.garment.findMany({
    where: { id: { in: clothingIds } },
    select: { id: true, category: true },
  })
  if (garments.length !== clothingIds.length) {
    throw new ApiError('INVALID_LAYERS', '部分单品不存在或已下架', 422)
  }
  const categoryById = new Map(garments.map((garment) => [garment.id, garment.category]))

  const outfit = await prisma.outfit.create({
    data: {
      ownerId: userId,
      title: input.title,
      source: 'FREE_STYLE',
      status: resultAsset ? 'READY' : 'SAVED',
      visibility: input.isPublic ? 'PUBLIC' : 'PRIVATE',
      basePhotoId: photo.id,
      resultImageId: resultAsset?.id ?? null,
      coverImageId: resultAsset?.id ?? photo.id,
      items: {
        create: input.layers.map((layer) => ({
          garmentId: layer.clothingId,
          slot: (categoryById.get(layer.clothingId) ?? 'TOP') as Slot,
          zIndex: layer.zIndex,
          isPrimary: true,
          transform: {
            x: layer.x,
            y: layer.y,
            scale: layer.scale,
            rotation: layer.rotation,
          } as Prisma.InputJsonValue,
        })),
      },
    },
  })

  if (input.draftId) {
    await prisma.outfitDraft.updateMany({
      where: { id: input.draftId, userId },
      data: {
        outfitId: outfit.id,
        status: 'SAVED',
        resultImageId: resultAsset?.id ?? null,
      },
    })
  }

  return toSavedOutfit(outfit, clothingIds)
}

export async function listMyOutfits(userId: string): Promise<SavedOutfit[]> {
  const outfits = await prisma.outfit.findMany({
    where: { ownerId: userId, deletedAt: null },
    include: { items: { select: { garmentId: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return outfits.map((outfit) =>
    toSavedOutfit(
      outfit,
      outfit.items.map((item) => item.garmentId),
    ),
  )
}
