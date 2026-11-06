import { prisma } from '@/server/db'
import { mediaUrl } from '@/server/media'
import { COLOR_HEX } from '@/lib/taxonomy'
import type { CandidateItem, Occasion, ParsedScene, RecommendProfile } from '@/server/ai/types'
import type { ClothingCategory, ClothingColor, ClothingSeason, ClothingStyle } from '@/types/studio'

const OCCASION_STYLES: Record<Occasion, ClothingStyle[]> = {
  DATE: ['ROMANTIC', 'FRENCH', 'KOREAN'],
  INTERVIEW: ['BUSINESS', 'SMART_CASUAL', 'MINIMAL'],
  WEDDING: ['ROMANTIC', 'FRENCH', 'PREPPY'],
  COMMUTE: ['SMART_CASUAL', 'MINIMAL', 'BUSINESS'],
  PARTY: ['Y2K', 'STREET', 'ROMANTIC'],
  TRAVEL: ['CASUAL', 'OUTDOOR', 'STREET'],
  SPORT: ['SPORTY', 'OUTDOOR'],
  DAILY: ['CASUAL', 'MINIMAL', 'KOREAN'],
}

interface ScoredCandidate {
  item: CandidateItem
  score: number
}

function genderAllowed(gender: string, profile: RecommendProfile): boolean {
  if (gender === 'UNISEX') return true
  if (profile.gender === 'FEMALE') return gender === 'WOMEN'
  if (profile.gender === 'MALE') return gender === 'MEN'
  return true
}

function scoreCandidate(
  item: CandidateItem,
  parsed: ParsedScene,
  profile: RecommendProfile,
): number {
  let score = item.popularity / 20
  const preferred = new Set(profile.styles)
  const inferred = new Set(OCCASION_STYLES[parsed.occasion] ?? [])

  for (const style of item.styles) {
    if (preferred.has(style)) score += 3
    if (inferred.has(style)) score += 2
  }

  if (item.seasons.includes(parsed.season)) score += 2
  else if (item.seasons.includes('ALL_SEASON')) score += 1

  if (parsed.formality >= 4 && item.styles.some((s) => s === 'BUSINESS' || s === 'SMART_CASUAL')) {
    score += 2
  }
  if (parsed.formality <= 2 && item.styles.some((s) => s === 'CASUAL' || s === 'ROMANTIC' || s === 'FRENCH')) {
    score += 1
  }
  if (parsed.riskFlags.includes('sun') && item.category === 'ACCESSORY') score += 1.5
  if (parsed.season === 'WINTER' && item.category === 'OUTERWEAR') score += 2
  if (parsed.riskFlags.includes('rain') && item.category === 'OUTERWEAR') score += 1

  return score
}

export interface RetrievalResult {
  candidates: CandidateItem[]
  byCategory: Partial<Record<ClothingCategory, CandidateItem[]>>
  relaxedBudget: boolean
}

/**
 * 关键词 + 规则检索：硬过滤（禁忌色/性别/预算/排除项）→ 加权打分 → 每个品类取 Top 4。
 * 生产可替换为 pgvector 语义召回，本函数接口保持不变。
 */
export async function retrieveCandidates(input: {
  parsed: ParsedScene
  profile: RecommendProfile
  excludeIds: string[]
}): Promise<RetrievalResult> {
  const { parsed, profile } = input
  const exclude = new Set(input.excludeIds)
  const avoid = new Set(profile.avoidColors)

  const rows = await prisma.garment.findMany({
    where: { status: 'PUBLISHED', source: 'PLATFORM' },
    include: { brand: true, cutout: true },
    take: 300,
  })

  const all: CandidateItem[] = rows
    .filter((row) => {
      if (exclude.has(row.id)) return false
      if (!genderAllowed(row.gender, profile)) return false
      if (row.colors.some((color) => avoid.has(color as ClothingColor))) return false
      return true
    })
    .map((row) => {
      const color = (row.colors[0] ?? 'MULTI') as ClothingColor
      const style = (row.styles[0] ?? 'CASUAL') as ClothingStyle
      const season = (row.seasons[0] ?? 'ALL_SEASON') as ClothingSeason
      return {
        id: row.id,
        name: row.name,
        category: row.category as ClothingCategory,
        color,
        colorHex: row.primaryColorHex ?? COLOR_HEX[color],
        styles: row.styles as ClothingStyle[],
        style,
        seasons: row.seasons as ClothingSeason[],
        season,
        material: row.materials[0] ?? null,
        brand: row.brand?.name ?? null,
        price: row.priceCents == null ? null : Math.round(row.priceCents / 100),
        currency: row.currency,
        purchaseUrl: row.purchaseUrl,
        imageUrl: mediaUrl(row.cutoutId ?? row.imageId) ?? '',
        cutoutUrl: mediaUrl(row.cutoutId ?? row.imageId) ?? '',
        popularity: row.popularity,
      } satisfies CandidateItem
    })

  const budget = profile.budget
  let relaxedBudget = false

  const withinBudget = (item: CandidateItem) =>
    budget == null || item.price == null || item.price <= budget * 1.15

  let filtered = all.filter(withinBudget)
  if (filtered.length === 0 && budget != null) {
    relaxedBudget = true
    filtered = all
  }

  const scored: ScoredCandidate[] = filtered
    .map((item) => ({ item, score: scoreCandidate(item, parsed, profile) }))
    .sort((a, b) => b.score - a.score)

  const byCategory: Partial<Record<ClothingCategory, CandidateItem[]>> = {}
  for (const entry of scored) {
    const list = byCategory[entry.item.category] ?? []
    if (list.length >= 4) continue
    list.push(entry.item)
    byCategory[entry.item.category] = list
  }

  const seen = new Set<string>()
  const candidates: CandidateItem[] = []
  for (const entry of scored) {
    if (!byCategory[entry.item.category]?.some((item) => item.id === entry.item.id)) continue
    if (seen.has(entry.item.id)) continue
    seen.add(entry.item.id)
    candidates.push(entry.item)
  }

  return { candidates, byCategory, relaxedBudget }
}
