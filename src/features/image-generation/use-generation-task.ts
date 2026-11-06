'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiClientError } from '@/lib/api-client'
import type { GenerationTaskStatus, ImageTaskState } from '@/types/image-generation'
import { fetchImageTask } from './api'

const TERMINAL: ImageTaskState[] = ['succeeded', 'failed', 'canceled']

export interface UseGenerationTaskOptions {
  enabled?: boolean
  intervalMs?: number
  maxIntervalMs?: number
}

export interface UseGenerationTaskResult {
  task: GenerationTaskStatus | null
  loading: boolean
  error: string | null
  isPolling: boolean
  refresh: () => void
}

/**
 * 轮询图像生成任务：自动停止在终态，失败时指数退避。
 * 与供应商无关——切换 Fashn / Replicate / ComfyUI 时前端无需改动。
 */
export function useGenerationTask(
  taskId: string | null | undefined,
  options: UseGenerationTaskOptions = {},
): UseGenerationTaskResult {
  const { enabled = true, intervalMs = 1500, maxIntervalMs = 8000 } = options

  const [task, setTask] = useState<GenerationTaskStatus | null>(null)
  const [loading, setLoading] = useState(Boolean(taskId))
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const attemptRef = useRef(0)

  const refresh = useCallback(() => {
    attemptRef.current = 0
    setNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!taskId || !enabled) {
      setLoading(false)
      return
    }

    let canceled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const schedule = (delay: number) => {
      if (canceled) return
      timer = setTimeout(() => {
        void tick()
      }, delay)
    }

    const tick = async () => {
      try {
        const data = await fetchImageTask(taskId)
        if (canceled) return
        setTask(data)
        setError(null)
        setLoading(false)
        attemptRef.current = 0
        if (!TERMINAL.includes(data.status)) schedule(intervalMs)
      } catch (err) {
        if (canceled) return
        const message = err instanceof ApiClientError ? err.message : '任务状态获取失败'
        setError(message)
        setLoading(false)
        attemptRef.current += 1
        const backoff = Math.min(maxIntervalMs, intervalMs * 2 ** attemptRef.current)
        schedule(backoff)
      }
    }

    setLoading(true)
    void tick()

    return () => {
      canceled = true
      if (timer) clearTimeout(timer)
    }
  }, [taskId, enabled, intervalMs, maxIntervalMs, nonce])

  return {
    task,
    loading,
    error,
    isPolling: Boolean(task && !TERMINAL.includes(task.status)),
    refresh,
  }
}
