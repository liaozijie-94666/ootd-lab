import { apiRequest } from '@/lib/api-client'
import type {
  CommunityComment,
  CommunityFeedResponse,
  CommunityPostDetail,
  CommunityProfileResponse,
} from '@/types/community'

export interface CreatePostPayload {
  title: string
  content: string
  imageIds: string[]
  tags: string[]
  outfitId?: string | null
  recommendationId?: string | null
}

export const communityApi = {
  list(params: { sort?: string; tag?: string; q?: string; page?: number; limit?: number }) {
    const search = new URLSearchParams()
    if (params.sort) search.set('sort', params.sort)
    if (params.tag) search.set('tag', params.tag)
    if (params.q) search.set('q', params.q)
    search.set('page', String(params.page ?? 1))
    search.set('limit', String(params.limit ?? 12))
    return apiRequest<CommunityFeedResponse>(`/api/posts?${search.toString()}`)
  },

  get(id: string) {
    return apiRequest<{ post: CommunityPostDetail }>(`/api/posts/${id}`)
  },

  create(payload: CreatePostPayload) {
    return apiRequest<{ post: CommunityPostDetail }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: Partial<CreatePostPayload>) {
    return apiRequest<{ post: CommunityPostDetail }>(`/api/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/api/posts/${id}`, { method: 'DELETE' })
  },

  like(id: string) {
    return apiRequest<{ liked: boolean; likeCount: number }>(`/api/posts/${id}/like`, {
      method: 'POST',
    })
  },

  favorite(id: string) {
    return apiRequest<{ favorited: boolean; bookmarkCount: number }>(`/api/posts/${id}/favorite`, {
      method: 'POST',
    })
  },

  comments(id: string, page = 1) {
    return apiRequest<{
      items: CommunityComment[]
      page: number
      hasMore: boolean
      total: number
    }>(`/api/posts/${id}/comments?page=${page}&limit=10`)
  },

  addComment(id: string, payload: { content: string; parentId?: string | null }) {
    return apiRequest<{ comment: CommunityComment }>(`/api/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  deleteComment(id: string) {
    return apiRequest<{ deleted: boolean }>(`/api/comments/${id}`, { method: 'DELETE' })
  },

  report(payload: {
    targetType: 'POST' | 'COMMENT' | 'USER'
    targetId: string
    reason: string
    detail?: string
  }) {
    return apiRequest<{ id: string; status: string }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  uploadImages(files: File[]) {
    const form = new FormData()
    for (const file of files) form.append('files', file)
    return apiRequest<{ images: Array<{ id: string; url: string }> }>('/api/community/images', {
      method: 'POST',
      body: form,
    })
  },

  tags() {
    return apiRequest<{ items: Array<{ id: string; name: string; slug: string; count: number }> }>(
      '/api/tags?limit=14',
    )
  },

  profile(userId: string) {
    return apiRequest<CommunityProfileResponse>(`/api/users/${userId}/profile`)
  },

  follow(userId: string) {
    return apiRequest<{ following: boolean; followers: number }>(`/api/users/${userId}/follow`, {
      method: 'POST',
    })
  },

  myOutfits() {
    return apiRequest<{ items: Array<{ id: string; title: string; coverUrl: string | null; itemCount: number }> }>(
      '/api/outfits/mine',
    )
  },

  myRecommendations() {
    return apiRequest<{
      items: Array<{ id: string; styleSummary: string; imageUrl: string | null; itemCount: number }>
    }>('/api/ai/recommendations/mine')
  },
}
