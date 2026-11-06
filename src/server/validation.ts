import { z } from 'zod'

export const CATEGORY_VALUES = [
  'TOP',
  'BOTTOM',
  'DRESS',
  'OUTERWEAR',
  'SHOES',
  'BAG',
  'ACCESSORY',
] as const

export const COLOR_VALUES = [
  'BLACK',
  'WHITE',
  'GRAY',
  'BEIGE',
  'BROWN',
  'RED',
  'ORANGE',
  'YELLOW',
  'GREEN',
  'BLUE',
  'NAVY',
  'PURPLE',
  'PINK',
  'GOLD',
  'SILVER',
  'MULTI',
] as const

export const STYLE_VALUES = [
  'MINIMAL',
  'CASUAL',
  'STREET',
  'BUSINESS',
  'SMART_CASUAL',
  'SPORTY',
  'ROMANTIC',
  'VINTAGE',
  'Y2K',
  'KOREAN',
  'FRENCH',
  'OUTDOOR',
  'PREPPY',
  'GOTHIC',
] as const

export const SEASON_VALUES = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_SEASON'] as const

export const layerSchema = z.object({
  id: z.string().min(1).max(64),
  clothingId: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().min(0.05).max(1.2),
  rotation: z.number().min(-180).max(180),
  zIndex: z.number().int().min(0).max(50),
})

export const layersSchema = z.array(layerSchema).min(1, '至少加入一件单品').max(8, '一套最多 8 件')

export const tryOnSchema = z.object({
  userPhotoId: z.string().min(1),
  layers: layersSchema,
  poseHint: z.enum(['standing', 'walking', 'sitting']).optional(),
  draftId: z.string().min(1).optional().nullable(),
})

export const saveOutfitSchema = z.object({
  title: z.string().trim().min(1, '请填写方案名称').max(60),
  isPublic: z.boolean(),
  userPhotoId: z.string().min(1),
  resultImageId: z.string().min(1).optional().nullable(),
  draftId: z.string().min(1).optional().nullable(),
  layers: layersSchema,
})

export const createPostSchema = z.object({
  title: z.string().trim().min(3, '标题至少 3 个字').max(80),
  body: z.string().trim().min(1, '写点搭配心得吧').max(5000),
  outfitId: z.string().min(1),
})

export const clothingFieldsSchema = z.object({
  name: z.string().trim().min(1, '请填写名称').max(40),
  category: z.enum(CATEGORY_VALUES),
  color: z.enum(COLOR_VALUES),
  style: z.enum(STYLE_VALUES),
  season: z.enum(SEASON_VALUES),
  material: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(40).optional(),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  purchaseUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), '购买链接需以 http(s) 开头'),
})

export const uploadPhotoFieldsSchema = z.object({
  kind: z.enum(['body', 'face']).default('body'),
  consent: z.string().optional(),
  policyVersion: z.string().max(20).optional(),
})
