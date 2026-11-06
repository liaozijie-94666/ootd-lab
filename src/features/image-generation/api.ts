import { apiRequest } from '@/lib/api-client'
import type {
  GenerationResult,
  GenerationTaskStatus,
  RecommendationImageInput,
  TryOnInput,
} from '@/types/image-generation'

export type CreateImageTaskPayload =
  | ({ kind: 'tryon' } & TryOnInput)
  | ({ kind: 'recommendation' } & RecommendationImageInput)

export function createImageTask(payload: CreateImageTaskPayload): Promise<GenerationResult> {
  return apiRequest<GenerationResult>('/api/image-generation/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchImageTask(taskId: string): Promise<GenerationTaskStatus> {
  return apiRequest<GenerationTaskStatus>(`/api/image-generation/tasks/${taskId}`)
}
