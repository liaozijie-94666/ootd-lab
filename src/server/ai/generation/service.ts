import crypto from 'node:crypto'
import type { GenerationTask } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import type {
  GenerationLogEntry,
  GenerationResult,
  GenerationTaskStatus,
  ImageGenerationKind,
  ImageProviderId,
  ImageTaskState,
  RecommendationImageInput,
  TryOnInput,
} from '@/types/image-generation'
import { absoluteMediaUrl, isAllowedInputUrl, loadImageBuffer, localUrlToDataUrl, persistGeneratedImage } from './assets'
import { buildPrompt, toProviderRequest, assertProviderRequest } from './prompts'
import { assertImagesSafe, assertTextSafe } from './safety'
import { ProviderError, SafetyError, type ImageProvider } from './types'
import {
  dbProviderOf,
  providerById,
  providerFromDb,
  resolveProviderChain,
} from './registry'

const urlSchema = z.string().min(1).refine(isAllowedInputUrl, '仅支持 http(s) 或站内媒体 URL')

const baseFields = {
  scene: z.string().trim().max(300).optional(),
  stylePrompt: z.string().trim().max(800).optional(),
  negativePrompt: z.string().trim().max(800).optional(),
  width: z.number().int().min(512).max(1536).optional(),
  height: z.number().int().min(512).max(1536).optional(),
  seed: z.number().int().min(0).max(2_147_483_647).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}

export const tryOnInputSchema = z.object({
  ...baseFields,
  userPhotoUrl: urlSchema,
  clothingImageUrls: z.array(urlSchema).min(1).max(8),
  poseHint: z.enum(['standing', 'walking', 'sitting']).optional(),
  preserveFace: z.boolean().optional(),
  background: z.enum(['original', 'plain', 'scene']).optional(),
})

export const recommendationInputSchema = z.object({
  ...baseFields,
  userPhotoUrl: urlSchema.optional().nullable(),
  clothingImageUrls: z.array(urlSchema).min(1).max(8),
  styleSummary: z.string().trim().max(60).optional(),
  referenceOutfit: z.string().max(120).optional(),
})

type ParsedInput = z.infer<typeof tryOnInputSchema> & {
  kind: ImageGenerationKind
  styleSummary?: string
  referenceOutfit?: string
  prompt?: string
}

interface StoredInput extends ParsedInput {
  width: number
  height: number
  seed: number
  prompt: string
  negativePrompt: string
}

interface StoredOutput {
  imageUrl?: string
  thumbnailUrl?: string
  width?: number
  height?: number
  provider?: ImageProviderId
  durationMs?: number
  degraded?: boolean
  fallbackText?: string
}

function mapStatus(status: GenerationTask['status']): ImageTaskState {
  if (status === 'SUCCEEDED') return 'succeeded'
  if (status === 'FAILED' || status === 'EXPIRED') return 'failed'
  if (status === 'CANCELED') return 'canceled'
  if (status === 'QUEUED') return 'queued'
  return 'processing'
}

function toError(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof ProviderError) {
    return { code: error.code, message: error.message, retryable: error.retryable }
  }
  if (error instanceof SafetyError) {
    return { code: error.code, message: error.message, retryable: false }
  }
  const message = error instanceof Error ? error.message : '图像生成失败'
  return { code: 'GENERATION_FAILED', message, retryable: true }
}

function maxAttempts(): number {
  const value = Number(process.env.IMAGE_MAX_ATTEMPTS ?? 3)
  if (!Number.isFinite(value)) return 3
  return Math.min(5, Math.max(1, Math.floor(value)))
}

export class ImageGenerationService {
  /**
   * 创建并提交试衣任务。
   * 返回的 GenerationResult 可能是 queued（需要轮询）或 succeeded（Mock / 同步供应商）。
   */
  async generateTryOn(input: TryOnInput & { userId: string }): Promise<GenerationResult> {
    const parsed = tryOnInputSchema.parse(input) as ParsedInput
    return this.create('tryon', parsed, input.userId)
  }

  async generateRecommendation(
    input: RecommendationImageInput & { userId: string },
  ): Promise<GenerationResult> {
    const parsed = recommendationInputSchema.parse(input) as ParsedInput
    return this.create('recommendation', parsed, input.userId)
  }

  async getTask(userId: string, taskId: string): Promise<GenerationTaskStatus> {
    const task = await prisma.generationTask.findFirst({
      where: { id: taskId, userId },
      include: { events: { orderBy: { createdAt: 'asc' }, take: 40 } },
    })
    if (!task) throw new ApiError('NOT_FOUND', '生成任务不存在', 404)

    const terminal = ['SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED'].includes(task.status)
    if (terminal || !task.providerJobId) return this.toStatus(task, task.events)

    const provider = providerById(providerFromDb(task.provider))
    const input = task.input as unknown as StoredInput

    try {
      if (!provider) throw new ProviderError('PROVIDER_MISSING', '供应商不可用', { retryable: false })

      const request = await this.buildProviderRequest(provider, input)
      const poll = await provider.poll(task.providerJobId, request)

      if (poll.status === 'succeeded' && (poll.imageUrl || poll.imageBuffer)) {
        return this.complete(task, provider.id, poll, input)
      }

      if (poll.status === 'failed') {
        return this.handleFailure(
          task,
          input,
          resolveProviderChain(input.kind),
          task.attempts,
          new ProviderError(
            poll.error?.code ?? 'PROVIDER_FAILED',
            poll.error?.message ?? '供应商生成失败',
            { retryable: poll.error?.retryable ?? true },
          ),
        )
      }

      await prisma.generationTask.update({
        where: { id: task.id },
        data: { status: 'RUNNING', progress: Math.max(task.progress, poll.progress ?? 30) },
      })
      return this.readStatus(userId, task.id)
    } catch (error) {
      return this.handleFailure(
        task,
        input,
        resolveProviderChain(input.kind),
        task.attempts,
        error,
      )
    }
  }

  /**
   * 供应商 Webhook：HMAC 校验 → 按 providerJobId 定位任务 → 完成/重试。
   * 始终返回 200（签名正确时），避免供应商重试风暴。
   */
  async handleWebhook(
    providerId: string,
    headers: Headers,
    rawBody: string,
  ): Promise<{ received: boolean }> {
    const secret = process.env.IMAGE_WEBHOOK_SECRET?.trim()
    if (!secret) throw new ApiError('WEBHOOK_DISABLED', '未配置 IMAGE_WEBHOOK_SECRET', 503)

    const signature = (headers.get('x-image-signature') ?? '').replace(/^sha256=/, '')
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const valid =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    if (!valid) throw new ApiError('INVALID_SIGNATURE', '签名校验失败', 401)

    const provider = providerById(providerId)
    if (!provider?.parseWebhook) throw new ApiError('NOT_FOUND', '不支持该供应商回调', 404)

    let event
    try {
      event = provider.parseWebhook(JSON.parse(rawBody))
    } catch {
      throw new ApiError('INVALID_PAYLOAD', '回调载荷不合法', 400)
    }

    const task = await prisma.generationTask.findFirst({
      where: { providerJobId: event.jobId },
    })
    if (!task) return { received: true }

    const input = task.input as unknown as StoredInput
    if (event.status === 'succeeded' && event.imageUrl) {
      await this.complete(task, provider.id, { imageUrl: event.imageUrl }, input)
    } else if (event.status === 'failed') {
      await this.handleFailure(
        task,
        input,
        resolveProviderChain(input.kind),
        task.attempts,
        new ProviderError(event.error?.code ?? 'PROVIDER_FAILED', event.error?.message ?? '生成失败', {
          retryable: event.error?.retryable ?? true,
        }),
      )
    }

    return { received: true }
  }

  private async create(
    kind: ImageGenerationKind,
    parsed: ParsedInput,
    userId: string,
  ): Promise<GenerationResult> {
    try {
      assertTextSafe({
        scene: parsed.scene,
        stylePrompt: parsed.stylePrompt,
        styleSummary: parsed.styleSummary,
        metadata: parsed.metadata,
      })
    } catch (error) {
      if (error instanceof SafetyError) {
        throw new ApiError('SAFETY_VIOLATION', error.message, 422, { matches: error.matches })
      }
      throw error
    }

    await assertImagesSafe([parsed.userPhotoUrl, ...parsed.clothingImageUrls].filter(Boolean) as string[])

    const built = buildPrompt({
      kind,
      scene: parsed.scene,
      stylePrompt: parsed.stylePrompt,
      negativePrompt: parsed.negativePrompt,
      width: parsed.width,
      height: parsed.height,
      seed: parsed.seed,
      styleSummary: parsed.styleSummary,
      metadata: parsed.metadata,
    })

    const input: StoredInput = {
      ...parsed,
      kind,
      width: built.width,
      height: built.height,
      seed: built.seed,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
    }

    const task = await prisma.generationTask.create({
      data: {
        userId,
        type: kind === 'tryon' ? 'VIRTUAL_TRYON' : 'SCENE_RECOMMEND',
        status: 'QUEUED',
        provider: 'MOCK',
        maxAttempts: maxAttempts(),
        input: input as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    })

    await this.log(task.id, 'QUEUED', '任务创建', { kind, providerChain: resolveProviderChain(kind).map((p) => p.id) })

    const chain = resolveProviderChain(kind)
    return this.run(task, input, chain, 0)
  }

  private async run(
    task: GenerationTask,
    input: StoredInput,
    chain: ImageProvider[],
    attemptIndex: number,
  ): Promise<GenerationTaskStatus> {
    const provider = chain[Math.min(attemptIndex, chain.length - 1)]
    const attempts = attemptIndex + 1

    await prisma.generationTask.update({
      where: { id: task.id },
      data: {
        provider: dbProviderOf(provider.id),
        status: 'RUNNING',
        attempts,
        progress: 5,
        errorCode: null,
        errorMessage: null,
        ...(attemptIndex === 0 ? { startedAt: new Date() } : {}),
      },
    })
    await this.log(task.id, 'RUNNING', `提交 ${provider.id}`, { attempt: attempts })

    try {
      const request = await this.buildProviderRequest(provider, input)
      const submit = await provider.submit(request)

      if (submit.status === 'succeeded' && (submit.imageBuffer || submit.imageUrl)) {
        return this.complete(task, provider.id, submit, input)
      }

      await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'RUNNING',
          providerJobId: submit.jobId,
          progress: submit.progress ?? 10,
        },
      })
      await this.log(task.id, 'RUNNING', `任务已提交 ${submit.jobId}`, {
        provider: provider.id,
        attempt: attempts,
      })

      return this.readStatus(task.userId, task.id)
    } catch (error) {
      return this.handleFailure(task, input, chain, attemptIndex, error)
    }
  }

  private async handleFailure(
    task: GenerationTask,
    input: StoredInput,
    chain: ImageProvider[],
    attemptIndex: number,
    error: unknown,
  ): Promise<GenerationTaskStatus> {
    const attempts = attemptIndex + 1
    const normalized = toError(error)
    const hasNextProvider = attempts < chain.length
    const canRetry = attempts < maxAttempts() && (normalized.retryable || hasNextProvider)

    if (canRetry) {
      await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: 'QUEUED',
          attempts,
          progress: 0,
          errorCode: normalized.code,
          errorMessage: normalized.message,
        },
      })
      await this.log(task.id, 'QUEUED', `第 ${attempts} 次失败，准备重试：${normalized.message}`, {
        code: normalized.code,
        attempt: attempts,
      })
      return this.run(task, input, chain, attempts)
    }

    const fallbackText = this.fallbackText(input)
    await prisma.generationTask.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        attempts,
        progress: 100,
        errorCode: normalized.code,
        errorMessage: normalized.message,
        finishedAt: new Date(),
        output: {
          fallbackText,
          degraded: true,
        } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    })
    await this.log(task.id, 'FAILED', normalized.message, {
      code: normalized.code,
      attempt: attempts,
      fallback: true,
    })

    return this.readStatus(task.userId, task.id)
  }

  private async complete(
    task: GenerationTask,
    providerId: ImageProviderId,
    submit: { imageUrl?: string; imageBuffer?: Buffer },
    input: StoredInput,
  ): Promise<GenerationTaskStatus> {
    let buffer = submit.imageBuffer
    if (!buffer) {
      if (!submit.imageUrl) {
        throw new ProviderError('EMPTY_RESULT', '供应商未返回图片', { retryable: true })
      }
      buffer = await loadImageBuffer(submit.imageUrl)
    }

    const persisted = await persistGeneratedImage(buffer, task.userId, {
      provider: providerId,
      taskId: task.id,
      kind: input.kind,
    })

    const durationMs = Date.now() - (task.startedAt ?? task.createdAt).getTime()
    const output = {
      imageUrl: persisted.imageUrl,
      thumbnailUrl: persisted.thumbnailUrl,
      width: persisted.width,
      height: persisted.height,
      provider: providerId,
      durationMs,
      degraded: providerId === 'mock',
    }

    await prisma.generationTask.update({
      where: { id: task.id },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        provider: dbProviderOf(providerId),
        output: output as unknown as import('@prisma/client').Prisma.InputJsonValue,
        errorCode: null,
        errorMessage: null,
        finishedAt: new Date(),
      },
    })

    await this.log(task.id, 'SUCCEEDED', '生成完成', {
      provider: providerId,
      durationMs,
      imageId: persisted.imageId,
    })

    return this.readStatus(task.userId, task.id)
  }

  private async buildProviderRequest(provider: ImageProvider, input: StoredInput) {
    const built = buildPrompt({
      kind: input.kind,
      scene: input.scene,
      stylePrompt: input.stylePrompt,
      negativePrompt: input.negativePrompt,
      width: input.width,
      height: input.height,
      seed: input.seed,
      styleSummary: input.styleSummary,
      metadata: input.metadata,
    })

    const request = toProviderRequest(
      built,
      input,
      input.kind,
      (url) => (provider.id === 'mock' ? url : absoluteMediaUrl(url)),
    )

    if (provider.id === 'mock') {
      request.userPhotoUrl = input.userPhotoUrl
        ? await localUrlToDataUrl(input.userPhotoUrl)
        : undefined
      request.clothingImageUrls = await Promise.all(
        input.clothingImageUrls.map((url) => localUrlToDataUrl(url)),
      )
    }

    assertProviderRequest(request)
    return request
  }

  private fallbackText(input: StoredInput): string {
    const metadata = input.metadata ?? {}
    if (typeof metadata.fallbackText === 'string') return metadata.fallbackText
    const names = Array.isArray(metadata.itemNames)
      ? metadata.itemNames.filter((value): value is string => typeof value === 'string')
      : []
    const scene = input.styleSummary || input.scene || '这套搭配'
    return `图片生成暂时不可用。${scene}的文字方案：${names.join('、') || '按已选单品搭配'}。可以稍后重试，或先保存方案。`
  }

  private async readStatus(userId: string, taskId: string): Promise<GenerationTaskStatus> {
    const task = await prisma.generationTask.findUnique({
      where: { id: taskId },
      include: { events: { orderBy: { createdAt: 'asc' }, take: 40 } },
    })
    if (!task) throw new ApiError('NOT_FOUND', '生成任务不存在', 404)
    return this.toStatus(task, task.events)
  }

  private toStatus(
    task: GenerationTask,
    events: Array<{ status: string; message: string | null; createdAt: Date }>,
  ): GenerationTaskStatus {
    const output = (task.output ?? {}) as StoredOutput
    const logs: GenerationLogEntry[] = events.map((event) => ({
      status: event.status,
      message: event.message,
      createdAt: event.createdAt.toISOString(),
    }))

    return {
      taskId: task.id,
      status: mapStatus(task.status),
      provider: providerFromDb(task.provider),
      progress: task.progress,
      imageUrl: output.imageUrl,
      thumbnailUrl: output.thumbnailUrl,
      width: output.width,
      height: output.height,
      durationMs: output.durationMs,
      error: task.errorCode
        ? {
            code: task.errorCode,
            message: task.errorMessage ?? '生成失败',
            retryable: mapStatus(task.status) === 'failed',
          }
        : undefined,
      fallbackText: output.fallbackText,
      attempts: task.attempts,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      providerJobId: task.providerJobId,
      logs,
    }
  }

  private async log(
    taskId: string,
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED',
    message: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await prisma.generationEvent.create({
        data: {
          taskId,
          status,
          message: message.slice(0, 500),
          payload: payload as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
      })
    } catch (error) {
      console.warn('[image-generation] 写任务日志失败', taskId, error)
    }
  }
}

export const imageGenerationService = new ImageGenerationService()
