export type ClothingCategory = 'TOP' | 'BOTTOM' | 'DRESS' | 'OUTERWEAR' | 'SHOES' | 'BAG' | 'ACCESSORY'

export type ClothingColor =
  | 'BLACK'
  | 'WHITE'
  | 'GRAY'
  | 'BEIGE'
  | 'BROWN'
  | 'RED'
  | 'ORANGE'
  | 'YELLOW'
  | 'GREEN'
  | 'BLUE'
  | 'NAVY'
  | 'PURPLE'
  | 'PINK'
  | 'GOLD'
  | 'SILVER'
  | 'MULTI'

export type ClothingStyle =
  | 'MINIMAL'
  | 'CASUAL'
  | 'STREET'
  | 'BUSINESS'
  | 'SMART_CASUAL'
  | 'SPORTY'
  | 'ROMANTIC'
  | 'VINTAGE'
  | 'Y2K'
  | 'KOREAN'
  | 'FRENCH'
  | 'OUTDOOR'
  | 'PREPPY'
  | 'GOTHIC'

export type ClothingSeason = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'ALL_SEASON'

export type ClothingSource = 'PLATFORM' | 'USER_UPLOAD' | 'AI_GENERATED'

export interface ClothingItem {
  id: string
  name: string
  category: ClothingCategory
  categoryLabel: string
  color: ClothingColor
  colorHex: string
  style: ClothingStyle
  styleLabel: string
  season: ClothingSeason
  seasonLabel: string
  seasons: ClothingSeason[]
  material: string | null
  brand: string | null
  price: number | null
  currency: string
  purchaseUrl: string | null
  imageUrl: string
  cutoutUrl: string
  source: ClothingSource
  status: string
  createdAt: string
}

export interface ClothingFacets {
  category: Partial<Record<ClothingCategory, number>>
  color: Partial<Record<ClothingColor, number>>
  style: Partial<Record<ClothingStyle, number>>
  season: Partial<Record<ClothingSeason, number>>
}

export interface ClothingListResponse {
  items: ClothingItem[]
  facets: ClothingFacets
  hasMore: boolean
  nextCursor: string | null
}

export interface PhotoInfo {
  id: string
  url: string
  width: number
  height: number
  kind: 'FACE' | 'FULL_BODY'
  encrypted: boolean
}

export interface BodyCheck {
  isFullBody: boolean
  confidence: number
  message: string
}

export interface OutfitLayer {
  id: string
  clothingId: string
  x: number
  y: number
  scale: number
  rotation: number
  zIndex: number
}

export interface LayerView extends OutfitLayer {
  clothing: ClothingItem
}

export type GenerationStatus =
  | 'QUEUED'
  | 'PREPROCESSING'
  | 'RUNNING'
  | 'POSTPROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'

export interface GenerationResult {
  imageId: string
  imageUrl: string
  width: number
  height: number
  degraded: boolean
  provider: string
}

export interface GenerationError {
  code: string
  message: string
  retryable: boolean
}

export interface TryOnTask {
  id: string
  status: GenerationStatus
  progress: number
  type: string
  attempts: number
  error: GenerationError | null
  input: {
    userPhotoId: string
    layers: OutfitLayer[]
    poseHint?: string
  }
  result: GenerationResult | null
  createdAt: string
  finishedAt: string | null
}

export interface SavedOutfit {
  id: string
  title: string
  coverUrl: string | null
  resultUrl: string | null
  isPublic: boolean
  itemCount: number
  clothingIds: string[]
  createdAt: string
}

export interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}
