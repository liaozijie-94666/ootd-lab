import type { ClothingCategory, ClothingColor, ClothingStyle } from './studio'

export type RecommendationStatus = 'PENDING' | 'READY' | 'DEGRADED' | 'FAILED'

export interface AiItem {
  clothingId: string | null
  name: string
  category: ClothingCategory
  color: ClothingColor
  colorHex: string
  material: string | null
  style: ClothingStyle | string
  imageUrl: string | null
  price: number | null
  purchaseUrl: string | null
  brand: string | null
  reason: string
  isAiSuggested: boolean
}

export interface BudgetInfo {
  total: number
  limit: number | null
  match: 'within' | 'over' | 'unset'
  diff: number
}

export interface AiParsedScene {
  occasion?: string
  formality?: number
  season?: string
  weather?: { condition?: string | null; tempC?: number | null }
  keywords?: string[]
  riskFlags?: string[]
}

export interface AiRecommendation {
  id: string
  status: RecommendationStatus
  scene: string
  styleSummary: string
  reason: string
  items: AiItem[]
  tips: string[]
  avoidTips: string[]
  budget: BudgetInfo
  parsed: AiParsedScene | null
  inputs: Record<string, unknown>
  imageUrl: string | null
  imageError: string | null
  isFavorite: boolean
  savedAt: string | null
  outfitId: string | null
  provider: string | null
  createdAt: string
}

export interface AiTask {
  id: string
  status: string
  progress: number
  error: { code: string; message: string } | null
}

export interface RecommendResponse {
  recommendation: AiRecommendation
  taskId: string | null
  pollAfterMs: number
}

export interface RecommendDetail {
  recommendation: AiRecommendation
  task: AiTask | null
}

export interface RecommendPayload {
  scene: string
  gender: 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_SAY'
  heightCm?: number
  weightKg?: number
  styles: ClothingStyle[]
  budget?: number
  city?: string
  weather?: { condition?: 'SUNNY' | 'CLOUDY' | 'RAIN' | 'SNOW'; tempC?: number }
  avoidColors: ClothingColor[]
  formality?: number
  userPhotoId?: string | null
  excludeClothingIds?: string[]
}

export interface RecommendFormValues {
  scene: string
  gender: RecommendPayload['gender']
  heightCm: string
  weightKg: string
  styles: ClothingStyle[]
  budget: string
  city: string
  condition: '' | 'SUNNY' | 'CLOUDY' | 'RAIN' | 'SNOW'
  tempC: string
  avoidColors: ClothingColor[]
  formality: number
}
