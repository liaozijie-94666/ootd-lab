import type { Prisma } from '@prisma/client'
import sharp from 'sharp'
import { prisma } from '@/server/db'
import { mediaUrl, saveMedia } from '@/server/media'
import { removeBackground } from '@/server/imaging/cutout'
import { ApiError } from '@/server/http'
import {
  CATEGORY_LABEL,
  COLOR_HEX,
  COLOR_LABEL,
  SEASON_LABEL,
  STYLE_LABEL,
} from '@/lib/taxonomy'
import type {
  ClothingCategory,
  ClothingColor,
  ClothingFacets,
  ClothingItem,
  ClothingListResponse,
  ClothingSeason,
  ClothingStyle,
} from '@/types/studio'

export type GarmentWithRelations = Prisma.GarmentGetPayload<{
  include: { brand: true; image: true; cutout: true }
}>

const garmentInclude = {
  brand: true,
  image: true,
  cutout: true,
} satisfies Prisma.GarmentInclude

export function toClothingDto(garment: GarmentWithRelations): ClothingItem {
  const color = (garment.colors[0] ?? 'MULTI') as ClothingColor
  const style = (garment.styles[0] ?? 'CASUAL') as ClothingStyle
  const season = (garment.seasons[0] ?? 'ALL_SEASON') as ClothingSeason
  const attributes = (garment.attributes ?? {}) as Record<string, unknown>
  const customBrand = typeof attributes.brand === 'string' ? attributes.brand : null

  return {
    id: garment.id,
    name: garment.name,
    category: garment.category as ClothingCategory,
    categoryLabel: CATEGORY_LABEL[garment.category],
    color,
    colorHex: garment.primaryColorHex ?? COLOR_HEX[color] ?? '#b4552d',
    style,
    styleLabel: STYLE_LABEL[style],
    season,
    seasonLabel: SEASON_LABEL[season],
    seasons: garment.seasons as ClothingSeason[],
    material: garment.materials[0] ?? null,
    brand: garment.brand?.name ?? customBrand,
    price: garment.priceCents == null ? null : Math.round(garment.priceCents / 100),
    currency: garment.currency,
    purchaseUrl: garment.purchaseUrl,
    imageUrl: mediaUrl(garment.imageId) ?? '/images/garment-placeholder.svg',
    cutoutUrl: mediaUrl(garment.cutoutId ?? garment.imageId) ?? '/images/garment-placeholder.svg',
    source: garment.source,
    status: garment.status,
    createdAt: garment.createdAt.toISOString(),
  }
}

export interface ListClothingParams {
  category?: ClothingCategory
  color?: ClothingColor
  style?: ClothingStyle
  season?: ClothingSeason
  source?: 'platform' | 'user'
  q?: string
  limit?: number
}

function buildWhere(userId: string, params: ListClothingParams): Prisma.GarmentWhereInput {
  const where: Prisma.GarmentWhereInput = { status: 'PUBLISHED' }

  if (params.source === 'user') {
    where.ownerId = userId
    where.source = 'USER_UPLOAD'
  } else {
    where.source = 'PLATFORM'
  }

  if (params.category) where.category = params.category
  if (params.color) where.colors = { has: params.color }
  if (params.style) where.styles = { has: params.style }
  if (params.season && params.season !== 'ALL_SEASON') {
    where.seasons = { hasSome: [params.season, 'ALL_SEASON'] }
  }
  if (params.q?.trim()) {
    const q = params.q.trim()
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { brand: { name: { contains: q, mode: 'insensitive' } } },
      { materials: { has: q } },
    ]
  }

  return where
}

function countFacets(rows: GarmentWithRelations[]): ClothingFacets {
  const facets: ClothingFacets = { category: {}, color: {}, style: {}, season: {} }
  for (const row of rows) {
    facets.category[row.category as ClothingCategory] = (facets.category[row.category as ClothingCategory] ?? 0) + 1
    for (const color of row.colors) {
      facets.color[color as ClothingColor] = (facets.color[color as ClothingColor] ?? 0) + 1
    }
    for (const style of row.styles) {
      facets.style[style as ClothingStyle] = (facets.style[style as ClothingStyle] ?? 0) + 1
    }
    for (const season of row.seasons) {
      facets.season[season as ClothingSeason] = (facets.season[season as ClothingSeason] ?? 0) + 1
    }
  }
  return facets
}

export async function listClothing(userId: string, params: ListClothingParams): Promise<ClothingListResponse> {
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 100)
  const where = buildWhere(userId, params)

  const [items, allForFacets] = await Promise.all([
    prisma.garment.findMany({
      where,
      include: garmentInclude,
      orderBy: [{ popularity: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    prisma.garment.findMany({
      where: {
        status: 'PUBLISHED',
        ...(params.source === 'user'
          ? { ownerId: userId, source: 'USER_UPLOAD' as const }
          : { source: 'PLATFORM' as const }),
      },
      include: garmentInclude,
    }),
  ])

  return {
    items: items.map(toClothingDto),
    facets: countFacets(allForFacets),
    hasMore: false,
    nextCursor: null,
  }
}

export async function getClothingById(id: string): Promise<ClothingItem> {
  const garment = await prisma.garment.findUnique({ where: { id }, include: garmentInclude })
  if (!garment) throw new ApiError('NOT_FOUND', '单品不存在', 404)
  return toClothingDto(garment)
}

export interface CreateUserClothingInput {
  userId: string
  name: string
  category: ClothingCategory
  color: ClothingColor
  style: ClothingStyle
  season: ClothingSeason
  material?: string
  brand?: string
  price?: number
  purchaseUrl?: string
  file: Buffer
  mimeType: string
}

export async function createUserClothing(input: CreateUserClothingInput): Promise<ClothingItem> {
  let cutout: Buffer
  try {
    cutout = await removeBackground(input.file)
  } catch {
    throw new ApiError('CUTOUT_FAILED', '抠图失败，请换一张背景更干净的照片', 422)
  }

  const cutoutMeta = await sharp(cutout).metadata()
  const rawAsset = await saveMedia({
    ownerId: input.userId,
    kind: 'GARMENT_RAW',
    buffer: input.file,
    mimeType: input.mimeType,
    visibility: 'PRIVATE',
  })
  const cutoutAsset = await saveMedia({
    ownerId: input.userId,
    kind: 'GARMENT_CUTOUT',
    buffer: cutout,
    mimeType: 'image/png',
    width: cutoutMeta.width,
    height: cutoutMeta.height,
    visibility: 'PRIVATE',
    metadata: { rawMediaId: rawAsset.id },
  })

  const garment = await prisma.garment.create({
    data: {
      slug: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name,
      category: input.category,
      subCategory: 'user-upload',
      gender: 'UNISEX',
      colors: [input.color],
      primaryColorHex: COLOR_HEX[input.color],
      styles: [input.style],
      seasons: [input.season],
      materials: input.material ? [input.material] : [],
      brandId: null,
      priceCents: input.price == null ? null : Math.round(input.price * 100),
      purchaseUrl: input.purchaseUrl || null,
      imageId: cutoutAsset.id,
      cutoutId: cutoutAsset.id,
      attributes: {
        brand: input.brand ?? null,
        rawMediaId: rawAsset.id,
        cutoutProvider: 'mock-threshold',
        labels: [CATEGORY_LABEL[input.category], COLOR_LABEL[input.color]],
      },
      source: 'USER_UPLOAD',
      ownerId: input.userId,
      status: 'PUBLISHED',
    },
    include: garmentInclude,
  })

  return toClothingDto(garment)
}
