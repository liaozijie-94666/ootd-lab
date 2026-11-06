import { apiRequest } from '@/lib/api-client'
import type {
  AiRecommendation,
  RecommendDetail,
  RecommendPayload,
  RecommendResponse,
} from '@/types/recommend'

export const recommendApi = {
  create(payload: RecommendPayload): Promise<RecommendResponse> {
    return apiRequest<RecommendResponse>('/api/ai/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  get(id: string): Promise<RecommendDetail> {
    return apiRequest<RecommendDetail>(`/api/ai/recommendations/${id}`)
  },

  reroll(id: string): Promise<RecommendResponse> {
    return apiRequest<RecommendResponse>(`/api/ai/recommendations/${id}/reroll`, {
      method: 'POST',
    })
  },

  favorite(id: string): Promise<{ favorited: boolean }> {
    return apiRequest(`/api/ai/recommendations/${id}/favorite`, { method: 'POST' })
  },

  save(id: string): Promise<{ saved: boolean; outfitId: string | null }> {
    return apiRequest(`/api/ai/recommendations/${id}/save`, { method: 'POST' })
  },

  share(id: string, payload: { title?: string; body?: string }): Promise<{
    post: { id: string; status: string }
  }> {
    return apiRequest(`/api/ai/recommendations/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  retryImage(id: string): Promise<{ taskId: string }> {
    return apiRequest(`/api/ai/recommendations/${id}/retry-image`, { method: 'POST' })
  },

  listMine(): Promise<{ items: AiRecommendation[] }> {
    return apiRequest('/api/ai/recommendations/mine')
  },
}
