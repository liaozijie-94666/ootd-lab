import type {
  BodyCheck,
  ClothingItem,
  ClothingListResponse,
  GenerationResult,
  OutfitLayer,
  PhotoInfo,
  SavedOutfit,
  TryOnTask,
} from '@/types/studio'
import { ApiClientError, apiRequest } from '@/lib/api-client'

export { ApiClientError }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(url, init)
}

export interface ClothingQuery {
  source: 'platform' | 'user'
  category?: string
  color?: string
  style?: string
  season?: string
  q?: string
}

export const studioApi = {
  listClothing(query: ClothingQuery): Promise<ClothingListResponse> {
    const params = new URLSearchParams()
    params.set('source', query.source)
    for (const key of ['category', 'color', 'style', 'season', 'q'] as const) {
      const value = query[key]
      if (value) params.set(key, value)
    }
    return request<ClothingListResponse>(`/api/clothing?${params.toString()}`)
  },

  uploadUserPhoto(
    file: Blob,
    kind: 'body' | 'face',
  ): Promise<{ photo: PhotoInfo; bodyCheck: BodyCheck }> {
    const form = new FormData()
    form.set('file', file, `photo-${Date.now()}.jpg`)
    form.set('kind', kind)
    form.set('consent', 'true')
    form.set('policyVersion', '2026-11-01')
    return request(`/api/upload/user-photo`, { method: 'POST', body: form })
  },

  uploadClothing(form: FormData): Promise<{ item: ClothingItem }> {
    return request(`/api/upload/clothing`, { method: 'POST', body: form })
  },

  deletePhoto(id: string): Promise<{ deleted: boolean }> {
    return request(`/api/upload/user-photo/${id}`, { method: 'DELETE' })
  },

  generateTryOn(payload: {
    userPhotoId: string
    layers: OutfitLayer[]
    draftId?: string | null
    poseHint?: string
  }): Promise<{ taskId: string; status: string; pollAfterMs: number; draftId: string }> {
    return request(`/api/generation/try-on`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getTask(id: string): Promise<TryOnTask> {
    return request(`/api/generation/tasks/${id}`)
  },

  saveOutfit(payload: {
    title: string
    isPublic: boolean
    userPhotoId: string
    resultImageId?: string | null
    draftId?: string | null
    layers: OutfitLayer[]
  }): Promise<{ outfit: SavedOutfit }> {
    return request(`/api/outfits`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  listMyOutfits(): Promise<{ items: SavedOutfit[] }> {
    return request(`/api/outfits/mine`)
  },

  sharePost(payload: { title: string; body: string; outfitId: string }): Promise<{
    post: { id: string; status: string }
  }> {
    return request(`/api/posts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export type { GenerationResult }
