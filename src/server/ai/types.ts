import type {
  ClothingCategory,
  ClothingColor,
  ClothingSeason,
  ClothingStyle,
} from '@/types/studio'

export type Occasion =
  | 'DATE'
  | 'INTERVIEW'
  | 'WEDDING'
  | 'COMMUTE'
  | 'PARTY'
  | 'TRAVEL'
  | 'SPORT'
  | 'DAILY'

export interface ParsedScene {
  occasion: Occasion
  formality: number
  season: ClothingSeason
  weather: { condition: string | null; tempC: number | null }
  keywords: string[]
  riskFlags: string[]
}

export interface RecommendProfile {
  gender: 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_SAY'
  heightCm?: number
  weightKg?: number
  styles: ClothingStyle[]
  budget?: number
  city?: string
  avoidColors: ClothingColor[]
  formality: number
}

export interface CandidateItem {
  id: string
  name: string
  category: ClothingCategory
  color: ClothingColor
  colorHex: string
  styles: ClothingStyle[]
  style: ClothingStyle
  seasons: ClothingSeason[]
  season: ClothingSeason
  material: string | null
  brand: string | null
  price: number | null
  currency: string
  purchaseUrl: string | null
  imageUrl: string
  cutoutUrl: string
  popularity: number
}

export interface DraftItem {
  clothingId: string | null
  name: string
  category: ClothingCategory
  color?: string
  material?: string
  style?: string
  price?: number
  purchaseUrl?: string
  reason: string
  isAiSuggested?: boolean
}

export interface StylistDraft {
  scene?: string
  styleSummary: string
  reason: string
  items: DraftItem[]
  imagePrompt: string
  tips: string[]
  avoidTips: string[]
}

export interface RecommendedItem {
  clothingId: string | null
  name: string
  category: ClothingCategory
  color: ClothingColor
  colorHex: string
  material: string | null
  style: ClothingStyle
  imageUrl: string | null
  price: number | null
  purchaseUrl: string | null
  brand: string | null
  reason: string
  isAiSuggested: boolean
}

export interface StylistContext {
  scene: string
  parsed: ParsedScene
  profile: RecommendProfile
  candidates: CandidateItem[]
  byCategory: Partial<Record<ClothingCategory, CandidateItem[]>>
  excludeIds: string[]
  seed: number
  /** 校验失败后的修复提示，仅第二次调用时传入 */
  repairHint?: string
}

export interface StylistResult {
  draft: StylistDraft
  items: RecommendedItem[]
  provider: string
  model: string
  latencyMs: number
  retried: boolean
}

export interface StylistProvider {
  readonly id: string
  readonly model: string
  isConfigured(): boolean
  generate(context: StylistContext): Promise<StylistDraft>
}
