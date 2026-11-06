import { z } from 'zod'
import {
  CATEGORY_VALUES,
  COLOR_VALUES,
} from '@/server/validation'
import { COLOR_HEX } from '@/lib/taxonomy'
import type {
  CandidateItem,
  RecommendedItem,
  StylistContext,
  StylistDraft,
} from '@/server/ai/types'
import type { ClothingCategory, ClothingColor, ClothingStyle } from '@/types/studio'

export const AI_ITEM_SCHEMA = z.object({
  clothingId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(1).max(60),
  category: z.enum(CATEGORY_VALUES),
  color: z.string().trim().max(20).optional(),
  material: z.string().trim().max(40).optional(),
  style: z.string().trim().max(20).optional(),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  purchaseUrl: z.string().trim().max(500).optional().nullable(),
  reason: z.string().trim().min(8, '每件单品的推荐理由至少 8 个字').max(120),
  isAiSuggested: z.boolean().optional(),
})

export const AI_DRAFT_SCHEMA = z.object({
  scene: z.string().trim().max(200).optional(),
  styleSummary: z.string().trim().min(4, '风格标题至少 4 个字').max(40),
  reason: z.string().trim().min(20, '整体理由至少 20 个字').max(400),
  items: z.array(AI_ITEM_SCHEMA).min(2, '至少 2 件单品').max(6, '最多 6 件单品'),
  imagePrompt: z.string().trim().min(10).max(600),
  tips: z.array(z.string().trim().max(80)).max(4).default([]),
  avoidTips: z.array(z.string().trim().max(80)).max(3).default([]),
})

export type ValidatedDraft = z.infer<typeof AI_DRAFT_SCHEMA>

function toColor(value: string | undefined): ClothingColor {
  return value && (COLOR_VALUES as readonly string[]).includes(value)
    ? (value as ClothingColor)
    : 'MULTI'
}

function toStyle(value: string | undefined): ClothingStyle {
  return (value as ClothingStyle) || 'CASUAL'
}

export function stripJsonFence(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return candidate.trim()
  return candidate.slice(start, end + 1)
}

/**
 * 把 LLM 输出归一化为「数据库可信数据 + 明确标注的 AI 建议」。
 * - clothingId 必须命中候选白名单，命中后用 DB 字段覆盖，杜绝编造价格/链接；
 * - 未命中的条目一律标记 isAiSuggested 并清空价格/购买链接；
 * - 强制品类合法（连衣裙不与上下装共存），补齐鞋与核心品类。
 */
export function normalizeDraft(draft: StylistDraft, context: StylistContext): RecommendedItem[] {
  const candidateMap = new Map<string, CandidateItem>(context.candidates.map((item) => [item.id, item]))
  const items: RecommendedItem[] = []
  const seen = new Set<string>()

  for (const item of draft.items) {
    const candidate = item.clothingId ? candidateMap.get(item.clothingId) : undefined

    if (candidate) {
      if (seen.has(candidate.id)) continue
      seen.add(candidate.id)
      items.push({
        clothingId: candidate.id,
        name: candidate.name,
        category: candidate.category,
        color: candidate.color,
        colorHex: candidate.colorHex,
        material: candidate.material,
        style: candidate.style,
        imageUrl: candidate.imageUrl,
        price: candidate.price,
        purchaseUrl: candidate.purchaseUrl,
        brand: candidate.brand,
        reason: item.reason,
        isAiSuggested: false,
      })
      continue
    }

    const color = toColor(item.color)
    items.push({
      clothingId: null,
      name: item.name,
      category: item.category,
      color,
      colorHex: COLOR_HEX[color],
      material: item.material ?? null,
      style: toStyle(item.style),
      imageUrl: null,
      price: null,
      purchaseUrl: null,
      brand: null,
      reason: item.reason,
      isAiSuggested: true,
    })
  }

  const hasDress = items.some((item) => item.category === 'DRESS')
  if (hasDress) {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (items[index].category === 'TOP' || items[index].category === 'BOTTOM') {
        items.splice(index, 1)
      }
    }
  }

  // 同一品类已有真实单品时，去掉重复的 AI 建议（例如“基础款上衣”与真实 T 恤并存）
  const realCategories = new Set(
    items.filter((item) => !item.isAiSuggested).map((item) => item.category),
  )
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].isAiSuggested && realCategories.has(items[index].category)) {
      items.splice(index, 1)
    }
  }

  const categories = new Set(items.map((item) => item.category))
  const coreSuggestions: Array<{ category: ClothingCategory; label: string }> = []

  if (!hasDress && !categories.has('TOP')) coreSuggestions.push({ category: 'TOP', label: '上装' })
  if (!hasDress && !categories.has('BOTTOM')) coreSuggestions.push({ category: 'BOTTOM', label: '下装' })
  if (!categories.has('SHOES')) coreSuggestions.push({ category: 'SHOES', label: '鞋' })

  for (const suggestion of coreSuggestions) {
    items.push(aiSuggestion(suggestion.category, suggestion.label, context))
  }

  const priority: ClothingCategory[] = ['ACCESSORY', 'BAG', 'OUTERWEAR']
  while (items.length > 6) {
    const dropIndex = items.findIndex((item) => item.isAiSuggested && priority.includes(item.category))
    if (dropIndex >= 0) {
      items.splice(dropIndex, 1)
      continue
    }
    const optionalIndex = items.findIndex((item) => priority.includes(item.category))
    if (optionalIndex >= 0) {
      items.splice(optionalIndex, 1)
      continue
    }
    items.pop()
  }

  return items
}

function aiSuggestion(category: ClothingCategory, label: string, context: StylistContext): RecommendedItem {
  const nameMap: Record<ClothingCategory, string> = {
    TOP: '垂坠感基础款上衣',
    BOTTOM: '利落直筒下装',
    DRESS: '线条简洁的连衣裙',
    OUTERWEAR: '轻量结构感外套',
    SHOES: '与整体呼应的低跟单鞋',
    BAG: '小巧硬挺手提包',
    ACCESSORY: '低调金属配饰',
  }
  const reasonMap: Record<ClothingCategory, string> = {
    TOP: `站内暂无符合预算的${label}，建议选垂坠面料、肩线合身的基础款，塞进下装能拉长比例。`,
    BOTTOM: `站内暂无符合预算的${label}，建议用高腰直筒版型平衡上装量感，颜色贴近鞋包更统一。`,
    DRESS: `站内暂无合适的${label}，建议选收腰、长度过膝的款式，适配${context.parsed.occasion === 'WEDDING' ? '婚礼' : '当前'}场合。`,
    OUTERWEAR: '早晚温差或室内冷气需要一层结构感，建议选不过胯的短外套，避免压身高。',
    SHOES: '站内暂无符合预算的鞋款，建议选裸色或与下装同色的低跟款，视觉上延长腿部线条。',
    BAG: '包型建议硬挺、尺寸不超过 A4，颜色从身上已有颜色里取，避免破坏整体。',
    ACCESSORY: '配饰点到为止：金属细框或珍珠耳饰即可，不要再叠加抢眼项链。',
  }

  return {
    clothingId: null,
    name: `${nameMap[category]}（AI 建议）`,
    category,
    color: 'MULTI',
    colorHex: COLOR_HEX.MULTI,
    material: null,
    style: 'MINIMAL',
    imageUrl: null,
    price: null,
    purchaseUrl: null,
    brand: null,
    reason: reasonMap[category],
    isAiSuggested: true,
  }
}
