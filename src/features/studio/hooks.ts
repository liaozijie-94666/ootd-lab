import { useQuery } from '@tanstack/react-query'
import { studioApi, type ClothingQuery } from './api'
import type { TryOnTask } from '@/types/studio'

export function useClothing(query: ClothingQuery) {
  return useQuery({
    queryKey: ['clothing', query.source, query.category, query.color, query.style, query.season, query.q],
    queryFn: () => studioApi.listClothing(query),
    staleTime: 60_000,
  })
}

const TERMINAL: TryOnTask['status'][] = ['SUCCEEDED', 'FAILED', 'CANCELED']

export function useGenerationTask(taskId: string | null) {
  return useQuery({
    queryKey: ['generation-task', taskId],
    queryFn: () => studioApi.getTask(taskId as string),
    enabled: Boolean(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && TERMINAL.includes(status) ? false : 1500
    },
    retry: 2,
  })
}
