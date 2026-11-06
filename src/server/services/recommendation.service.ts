import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import { copyMediaToPublic, getOwnedMedia, mediaUrl, readMediaBuffer, saveMedia } from '@/server/media'
import { enqueue } from '@/server/queue/inline'
import { isSyncTaskMode } from '@/server/queue/mode'
import { retrieveCandidates } from '@/server/ai/retrieval'
import { generateStylistDraft } from '@/server/ai/registry'
import { CompositeImageService } from '@/server/ai/image-generation'
import { COLOR_VALUES, STYLE_VALUES } from '@/server/validation'
import { DEFAULT_LAYER_TRANSFORM } from '@/lib/taxonomy'
import type {
  CandidateItem,
  Occasion,
  ParsedScene,
  RecommendProfile,
  RecommendedItem,
} from '@/server/ai/types'
import type { ClothingCategory, ClothingColor, ClothingSeason, ClothingStyle } from '@/types/studio'

const GENDER_VALUES = ['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_SAY'] as const
const WEATHER_VALUES = ['SUNNY', 'CLOUDY', 'RAIN', 'SNOW'] as const

export const recommendInputSchema = z.object({
  scene: z.string().trim().min(2, '描述一下要去哪、做什么').max(200, '最多 200 字'),
  gender: z.enum(GENDER_VALUES).default('PREFER_NOT_SAY'),
  heightCm: z.number().int().min(120).max(230).optional(),
  weightKg: z.number().int().min(30).max(200).optional(),
  styles: z.array(z.enum(STYLE_VALUES)).max(3).default([]),
  budget: z.number().int().min(100).max(100_000).optional(),
  city: z.string().trim().max(40).optional(),
  weather: z
    .object({
      condition: z.enum(WEATHER_VALUES).optional(),
      tempC: z.number().min(-30).max(45).optional(),
    })
    .optional(),
  avoidColors: z.array(z.enum(COLOR_VALUES)).max(6).default([]),
  formality: z.number().int().min(1).max(5).optional(),
  userPhotoId: z.string().min(1).optional().nullable(),
  excludeClothingIds: z.array(z.string()).max(20).default([]),
})

export type RecommendInput = z.infer<typeof recommendInputSchema>

interface RecommendationTaskInput {
  recommendationId: string
  scene: string
  imagePrompt: string
  layers: Array<{
    clothingId: string
    x: number
    y: number
    scale: number
    rotation: number
    zIndex: number
  }>
  userPhotoId?: string | null
}

const OCCASION_RULES: Array<{ pattern: RegExp; occasion: Occasion }> = [
  { pattern: /面试|interview|招聘|校招/, occasion: 'INTERVIEW' },
  { pattern: /婚礼|wedding|伴娘|领证/, occasion: 'WEDDING' },
  { pattern: /派对|party|音乐节|酒吧|年会|蹦迪/, occasion: 'PARTY' },
  { pattern: /旅行|旅游|出游|travel|度假|出差/, occasion: 'TRAVEL' },
  { pattern: /运动|健身|跑步|sport|瑜伽|徒步/, occasion: 'SPORT' },
  { pattern: /通勤|上班|办公|会议|commute|工位/, occasion: 'COMMUTE' },
  { pattern: /约会|date|海边|晚餐|纪念日|看展/, occasion: 'DATE' },
]

const FORMALITY_BY_OCCASION: Record<Occasion, number> = {
  INTERVIEW: 4,
  WEDDING: 5,
  COMMUTE: 3,
  DATE: 2,
  PARTY: 3,
  TRAVEL: 2,
  SPORT: 1,
  DAILY: 2,
}

function seasonOf(input: RecommendInput, scene: string): ClothingSeason {
  const temp = input.weather?.tempC
  if (temp != null) {
    if (temp >= 26) return 'SUMMER'
    if (temp >= 18) return 'SPRING'
    if (temp >= 8) return 'AUTUMN'
    return 'WINTER'
  }
  if (/冬|雪|圣诞|羽绒/.test(scene)) return 'WINTER'
  if (/秋|落叶|风衣/.test(scene)) return 'AUTUMN'
  if (/夏|海边|沙滩|短袖|海岛/.test(scene)) return 'SUMMER'
  if (/春|樱花/.test(scene)) return 'SPRING'

  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'SPRING'
  if (month >= 6 && month <= 8) return 'SUMMER'
  if (month >= 9 && month <= 11) return 'AUTUMN'
  return 'WINTER'
}

export function parseScene(raw: RecommendInput): ParsedScene {
  const scene = raw.scene
  const matched = OCCASION_RULES.find((rule) => rule.pattern.test(scene))
  const occasion: Occasion = matched?.occasion ?? 'DAILY'

  const formality = raw.formality ?? FORMALITY_BY_OCCASION[occasion]
  const season = seasonOf(raw, scene)
  const keywords: string[] = []
  for (const word of ['海边', '面试', '婚礼', '约会', '通勤', '派对', '旅行', '运动', '下雨', '降温']) {
    if (scene.includes(word)) keywords.push(word)
  }

  const riskFlags: string[] = []
  if (/海边|沙滩|海岛/.test(scene)) riskFlags.push('wind', 'sun')
  if (raw.weather?.condition === 'RAIN' || /下雨|雨天/.test(scene)) riskFlags.push('rain')
  if (season === 'WINTER' || (raw.weather?.tempC ?? 99) < 10) riskFlags.push('cold')
  if (occasion === 'INTERVIEW') riskFlags.push('conservative')
  if (occasion === 'WEDDING' || occasion === 'PARTY') riskFlags.push('photo')
  if (raw.weather?.condition === 'SUNNY' && !riskFlags.includes('sun')) riskFlags.push('sun')

  return {
    occasion,
    formality,
    season,
    weather: {
      condition: raw.weather?.condition ?? null,
      tempC: raw.weather?.tempC ?? null,
    },
    keywords,
    riskFlags,
  }
}

function toProfile(input: RecommendInput, parsed: ParsedScene): RecommendProfile {
  return {
    gender: input.gender,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    styles: input.styles as ClothingStyle[],
    budget: input.budget,
    city: input.city,
    avoidColors: input.avoidColors as ClothingColor[],
    formality: parsed.formality,
  }
}

function layersOf(items: RecommendedItem[], byId: Map<string, CandidateItem>) {
  const dbItems = items.filter((item) => item.clothingId && byId.has(item.clothingId))
  return dbItems.map((item, index) => {
    const transform = DEFAULT_LAYER_TRANSFORM[item.category]
    return {
      clothingId: item.clothingId as string,
      x: transform.x,
      y: transform.y,
      scale: transform.scale,
      rotation: 0,
      zIndex: index + 1,
    }
  })
}

function budgetOf(items: RecommendedItem[], limit: number | null) {
  const total = items.reduce((sum, item) => sum + (item.isAiSuggested ? 0 : (item.price ?? 0)), 0)
  if (limit == null) {
    return { total, limit: null, match: 'unset' as const, diff: 0 }
  }
  return {
    total,
    limit,
    match: total <= limit ? ('within' as const) : ('over' as const),
    diff: limit - total,
  }
}

type RecommendationRow = Prisma.RecommendationGetPayload<{ include: { task: true } }>

function toRecommendationDto(row: RecommendationRow) {
  const items = (row.itemsJson ?? []) as unknown as RecommendedItem[]
  const inputs = (row.inputs ?? {}) as unknown as Partial<RecommendProfile>
  const limit = inputs.budget ?? null

  return {
    id: row.id,
    status: row.status,
    scene: row.sceneText,
    styleSummary: row.styleTitle ?? '',
    reason: row.rationale ?? '',
    items,
    tips: row.tips,
    avoidTips: row.avoidTips,
    budget: budgetOf(items, limit),
    parsed: row.parsed,
    inputs,
    imageUrl: mediaUrl(row.resultImageId),
    imageError: row.imageError,
    isFavorite: row.isFavorite,
    savedAt: row.savedAt?.toISOString() ?? null,
    outfitId: row.outfitId,
    provider: row.provider,
    createdAt: row.createdAt.toISOString(),
  }
}

function toTaskDto(task: RecommendationRow['task']) {
  if (!task) return null
  return {
    id: task.id,
    status: task.status,
    progress: task.progress,
    error: task.errorCode
      ? { code: task.errorCode, message: task.errorMessage ?? '生成失败' }
      : null,
  }
}

export async function createRecommendation(
  userId: string,
  raw: unknown,
  parentId: string | null = null,
) {
  const input = recommendInputSchema.parse(raw) as RecommendInput
  const parsed = parseScene(input)
  const profile = toProfile(input, parsed)

  if (input.userPhotoId) {
    await getOwnedMedia(input.userPhotoId, userId)
  }

  const retrieval = await retrieveCandidates({
    parsed,
    profile,
    excludeIds: input.excludeClothingIds,
  })

  const context = {
    scene: input.scene,
    parsed,
    profile,
    candidates: retrieval.candidates,
    byCategory: retrieval.byCategory,
    excludeIds: input.excludeClothingIds,
    seed: Math.floor(Math.random() * 1000),
  }

  const stylist = await generateStylistDraft(context)
  const items = stylist.items.slice(0, 6)
  const byId = new Map(retrieval.candidates.map((item) => [item.id, item]))
  const layers = layersOf(items, byId)
  const dbItemCount = layers.length

  const recommendation = await prisma.recommendation.create({
    data: {
      userId,
      sceneText: input.scene,
      parsed: parsed as unknown as Prisma.InputJsonValue,
      inputs: input as unknown as Prisma.InputJsonValue,
      styleTitle: stylist.draft.styleSummary.slice(0, 60),
      rationale: stylist.draft.reason,
      tips: stylist.draft.tips.slice(0, 4),
      avoidTips: stylist.draft.avoidTips.slice(0, 3),
      provider: stylist.provider,
      model: stylist.model,
      latencyMs: stylist.latencyMs,
      status: dbItemCount > 0 ? 'PENDING' : 'DEGRADED',
      imageError: dbItemCount > 0 ? null : '站内暂无可组合的单品，已返回纯文字方案',
      itemsJson: items as unknown as Prisma.InputJsonValue,
      parentId,
    },
  })

  const itemByClothingId = new Map(
    items
      .filter((item): item is typeof item & { clothingId: string } => Boolean(item.clothingId))
      .map((item) => [item.clothingId, item]),
  )

  if (dbItemCount > 0) {
    const outfit = await prisma.outfit.create({
      data: {
        ownerId: userId,
        title: stylist.draft.styleSummary.slice(0, 60),
        source: 'AI_RECOMMENDATION',
        status: 'SAVED',
        visibility: 'PRIVATE',
        items: {
          create: layers.map((layer) => ({
            garmentId: layer.clothingId,
            slot: (itemByClothingId.get(layer.clothingId)?.category ?? 'TOP') as ClothingCategory,
            zIndex: layer.zIndex,
            isPrimary: true,
            transform: {
              x: layer.x,
              y: layer.y,
              scale: layer.scale,
              rotation: layer.rotation,
            } as Prisma.InputJsonValue,
            reason: itemByClothingId.get(layer.clothingId)?.reason ?? null,
          })),
        },
      },
    })

    await prisma.recommendation.update({
      where: { id: recommendation.id },
      data: { outfitId: outfit.id },
    })
  }

  let taskId: string | null = null
  if (dbItemCount > 0) {
    const task = await prisma.generationTask.create({
      data: {
        userId,
        type: 'SCENE_RECOMMEND',
        status: 'QUEUED',
        provider: 'MOCK',
        maxAttempts: 2,
        input: {
          recommendationId: recommendation.id,
          scene: input.scene,
          imagePrompt: stylist.draft.imagePrompt,
          layers,
          userPhotoId: input.userPhotoId ?? null,
        } as unknown as Prisma.InputJsonValue,
      },
    })
    taskId = task.id
    await prisma.recommendation.update({
      where: { id: recommendation.id },
      data: { taskId: task.id },
    })
    if (isSyncTaskMode()) {
      await runRecommendationTask(task.id)
    } else {
      enqueue(() => runRecommendationTask(task.id))
    }
  }

  const fresh = await prisma.recommendation.findUniqueOrThrow({
    where: { id: recommendation.id },
    include: { task: true },
  })

  return {
    recommendation: toRecommendationDto(fresh),
    taskId,
    pollAfterMs: 1500,
  }
}

export async function getRecommendation(userId: string, id: string) {
  const row = await prisma.recommendation.findFirst({
    where: { id, userId },
    include: { task: true },
  })
  if (!row) throw new ApiError('NOT_FOUND', '推荐不存在', 404)

  return {
    recommendation: toRecommendationDto(row),
    task: toTaskDto(row.task),
  }
}

export async function listMyRecommendations(userId: string) {
  const rows = await prisma.recommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { task: true },
  })

  return rows.map((row) => {
    const dto = toRecommendationDto(row)
    return {
      id: dto.id,
      scene: dto.scene,
      styleSummary: dto.styleSummary,
      imageUrl: dto.imageUrl,
      status: dto.status,
      isFavorite: dto.isFavorite,
      itemCount: dto.items.length,
      createdAt: dto.createdAt,
    }
  })
}

export async function toggleFavorite(userId: string, id: string) {
  const row = await prisma.recommendation.findFirst({ where: { id, userId } })
  if (!row) throw new ApiError('NOT_FOUND', '推荐不存在', 404)
  const updated = await prisma.recommendation.update({
    where: { id },
    data: { isFavorite: !row.isFavorite },
  })
  return { favorited: updated.isFavorite }
}

export async function saveRecommendation(userId: string, id: string) {
  const row = await prisma.recommendation.findFirst({
    where: { id, userId },
    include: { outfit: true },
  })
  if (!row) throw new ApiError('NOT_FOUND', '推荐不存在', 404)

  await prisma.$transaction([
    prisma.recommendation.update({ where: { id }, data: { savedAt: new Date() } }),
    ...(row.outfitId
      ? [
          prisma.outfit.update({
            where: { id: row.outfitId },
            data: { status: 'SAVED', title: row.styleTitle ?? row.outfit?.title ?? 'AI 推荐方案' },
          }),
        ]
      : []),
  ])

  return { saved: true, outfitId: row.outfitId }
}

export async function shareRecommendation(userId: string, id: string, raw: unknown) {
  const body = z
    .object({ title: z.string().trim().max(80).optional(), body: z.string().trim().max(5000).optional() })
    .parse(raw ?? {})

  const row = await prisma.recommendation.findFirst({ where: { id, userId } })
  if (!row) throw new ApiError('NOT_FOUND', '推荐不存在', 404)

  const title = (body.title || row.styleTitle || 'AI 穿搭推荐').slice(0, 80)
  const content = (body.body || row.rationale || '来自 OOTD Lab 的 AI 穿搭推荐').slice(0, 5000)
  const coverImageId = row.resultImageId
    ? await copyMediaToPublic(row.resultImageId, userId)
    : null

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      title: title.length >= 3 ? title : `${title} 推荐`,
      body: content,
      coverImageId,
      outfitId: row.outfitId,
      recommendationId: row.id,
      status: 'PUBLISHED',
      moderationStatus: 'APPROVED',
      publishedAt: new Date(),
    },
  })

  return { post: { id: post.id, status: post.status } }
}

export async function rerollRecommendation(userId: string, id: string) {
  const row = await prisma.recommendation.findFirst({ where: { id, userId } })
  if (!row) throw new ApiError('NOT_FOUND', '推荐不存在', 404)

  const inputs = (row.inputs ?? {}) as unknown as RecommendInput
  const items = (row.itemsJson ?? []) as unknown as RecommendedItem[]
  const exclude = [
    ...new Set([
      ...(inputs.excludeClothingIds ?? []),
      ...items.map((item) => item.clothingId).filter((value): value is string => Boolean(value)),
    ]),
  ]

  return createRecommendation(
    userId,
    {
      ...inputs,
      scene: row.sceneText,
      excludeClothingIds: exclude,
      userPhotoId: null,
    },
    row.id,
  )
}

export async function retryRecommendationImage(userId: string, id: string) {
  const row = await prisma.recommendation.findFirst({
    where: { id, userId },
    include: { task: true },
  })
  if (!row) throw new ApiError('NOT_FOUND', '推荐不存在', 404)
  if (row.task && ['QUEUED', 'RUNNING', 'PREPROCESSING', 'POSTPROCESSING'].includes(row.task.status)) {
    return { taskId: row.task.id }
  }
  if (!row.task) throw new ApiError('NOT_RETRYABLE', '该推荐没有可重试的出图任务', 422)

  const input = row.task.input as unknown as RecommendationTaskInput
  const task = await prisma.generationTask.create({
    data: {
      userId,
      type: 'SCENE_RECOMMEND',
      status: 'QUEUED',
      provider: 'MOCK',
      maxAttempts: 2,
      input: { ...input, recommendationId: row.id } as unknown as Prisma.InputJsonValue,
    },
  })

  await prisma.recommendation.update({
    where: { id },
    data: { status: 'PENDING', imageError: null, taskId: task.id },
  })

  if (isSyncTaskMode()) {
    await runRecommendationTask(task.id)
  } else {
    enqueue(() => runRecommendationTask(task.id))
  }
  return { taskId: task.id }
}

async function transition(
  taskId: string,
  status: 'PREPROCESSING' | 'RUNNING' | 'POSTPROCESSING' | 'SUCCEEDED' | 'FAILED',
  progress: number,
  message?: string,
) {
  await prisma.generationTask.update({
    where: { id: taskId },
    data: {
      status,
      progress,
      ...(status === 'RUNNING' ? { startedAt: new Date() } : {}),
      ...(status === 'SUCCEEDED' || status === 'FAILED' ? { finishedAt: new Date() } : {}),
    },
  })
  await prisma.generationEvent.create({
    data: { taskId, status, message: message ?? null },
  })
}

export async function runRecommendationTask(taskId: string): Promise<void> {
  const task = await prisma.generationTask.findUnique({ where: { id: taskId } })
  if (!task || task.status !== 'QUEUED') return

  const input = task.input as unknown as RecommendationTaskInput

  try {
    await transition(taskId, 'PREPROCESSING', 18, '加载推荐单品素材')

    const recommendation = await prisma.recommendation.findUnique({
      where: { id: input.recommendationId },
    })
    if (!recommendation) throw new ApiError('NOT_FOUND', '推荐不存在', 404)

    const buffers = new Map<string, Buffer>()
    for (const layer of input.layers) {
      const garment = await prisma.garment.findUnique({
        where: { id: layer.clothingId },
        include: { cutout: true },
      })
      if (!garment?.cutoutId) {
        throw new ApiError('ITEM_IMAGE_MISSING', `「${garment?.name ?? '单品'}」缺少可用图片`, 422)
      }
      const asset = await prisma.mediaAsset.findFirst({
        where: { id: garment.cutoutId, status: 'READY', deletedAt: null },
      })
      if (!asset) {
        throw new ApiError('ITEM_IMAGE_MISSING', `「${garment.name}」图片已失效`, 422)
      }
      buffers.set(layer.clothingId, await readMediaBuffer(asset))
    }

    let userPhoto: Buffer | undefined
    if (input.userPhotoId) {
      const media = await getOwnedMedia(input.userPhotoId, task.userId)
      userPhoto = await readMediaBuffer(media)
    }

    await transition(taskId, 'RUNNING', 52, '合成推荐效果图')

    const image = await CompositeImageService.generateRecommendation({
      userPhoto,
      layers: input.layers.flatMap((layer) => {
        const buffer = buffers.get(layer.clothingId)
        return buffer ? [{ buffer, ...layer }] : []
      }),
      scene: input.scene,
      imagePrompt: input.imagePrompt,
    })

    await transition(taskId, 'POSTPROCESSING', 84, '保存效果图')

    const asset = await saveMedia({
      ownerId: task.userId,
      kind: 'RESULT',
      buffer: image.buffer,
      mimeType: 'image/jpeg',
      width: image.width,
      height: image.height,
      visibility: 'PRIVATE',
      metadata: { provider: image.provider, scene: input.scene },
    })

    await prisma.recommendation.update({
      where: { id: recommendation.id },
      data: { status: 'READY', resultImageId: asset.id, imageError: null },
    })

    if (recommendation.outfitId) {
      await prisma.outfit.update({
        where: { id: recommendation.outfitId },
        data: { resultImageId: asset.id, coverImageId: asset.id },
      })
    }

    await prisma.generationTask.update({
      where: { id: taskId },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        attempts: task.attempts + 1,
        output: {
          imageId: asset.id,
          imageUrl: mediaUrl(asset.id),
          width: image.width,
          height: image.height,
          provider: image.provider,
        } as unknown as Prisma.InputJsonValue,
      },
    })
    await prisma.generationEvent.create({
      data: { taskId, status: 'SUCCEEDED', message: '推荐效果图已生成' },
    })
  } catch (error) {
    const attempts = task.attempts + 1
    const code = error instanceof ApiError ? error.code : 'IMAGE_GENERATION_FAILED'
    const message = error instanceof Error ? error.message : '效果图生成失败'
    const retryable = !(error instanceof ApiError && error.status < 500)

    if (retryable && attempts < task.maxAttempts) {
      await prisma.generationTask.update({
        where: { id: taskId },
        data: { status: 'QUEUED', attempts, errorCode: code, errorMessage: message, progress: 0 },
      })
      if (isSyncTaskMode()) {
        await runRecommendationTask(taskId)
        return
      }
      enqueue(() => runRecommendationTask(taskId), 1200)
      return
    }

    console.error('[recommendation] image failed', taskId, error)
    await prisma.generationTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        attempts,
        errorCode: code,
        errorMessage: message,
        finishedAt: new Date(),
      },
    })
    await prisma.generationEvent.create({
      data: { taskId, status: 'FAILED', message },
    })

    await prisma.recommendation.updateMany({
      where: { id: input.recommendationId },
      data: {
        status: 'DEGRADED',
        imageError: '效果图生成失败，已保留文字方案，可稍后重试',
      },
    })
  }
}
