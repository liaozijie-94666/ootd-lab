import type { Prisma } from '@prisma/client'
import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import { getOwnedMedia, mediaUrl, readMediaBuffer, saveMedia } from '@/server/media'
import { composeTryOn, type CompositeLayer } from '@/server/imaging/composite'
import { enqueue } from '@/server/queue/inline'
import { isSyncTaskMode } from '@/server/queue/mode'
import { tryOnSchema } from '@/server/validation'
import type { GenerationResult, OutfitLayer, TryOnTask } from '@/types/studio'
import type { z } from 'zod'

type TryOnInput = z.infer<typeof tryOnSchema>

interface StoredInput {
  userPhotoId: string
  layers: OutfitLayer[]
  poseHint?: string
  draftId?: string | null
}

interface TaskOutput extends GenerationResult {
  imageId: string
}

function toTaskDto(task: {
  id: string
  status: string
  progress: number
  type: string
  attempts: number
  errorCode: string | null
  errorMessage: string | null
  input: Prisma.JsonValue
  output: Prisma.JsonValue
  createdAt: Date
  finishedAt: Date | null
}): TryOnTask {
  const output = task.output as unknown as TaskOutput | null
  const retryableCodes = new Set(['PROVIDER_TIMEOUT', 'PROVIDER_ERROR', 'GENERATION_FAILED'])

  return {
    id: task.id,
    status: task.status as TryOnTask['status'],
    progress: task.progress,
    type: task.type,
    attempts: task.attempts,
    error: task.errorCode
      ? {
          code: task.errorCode,
          message: task.errorMessage ?? '生成失败，请重试',
          retryable: retryableCodes.has(task.errorCode),
        }
      : null,
    input: task.input as unknown as StoredInput,
    result: output
      ? {
          imageId: output.imageId,
          imageUrl: output.imageUrl,
          width: output.width,
          height: output.height,
          degraded: Boolean(output.degraded),
          provider: output.provider ?? 'mock-composite',
        }
      : null,
    createdAt: task.createdAt.toISOString(),
    finishedAt: task.finishedAt?.toISOString() ?? null,
  }
}

async function transition(
  taskId: string,
  status: TryOnTask['status'],
  progress: number,
  message?: string,
): Promise<void> {
  const now = new Date()
  await prisma.generationTask.update({
    where: { id: taskId },
    data: {
      status,
      progress,
      ...(status === 'RUNNING' ? { startedAt: now } : {}),
    },
  })
  await prisma.generationEvent.create({
    data: { taskId, status, message: message ?? null },
  })
}

export async function createTryOn(
  userId: string,
  rawInput: unknown,
): Promise<{ taskId: string; status: string; pollAfterMs: number; draftId: string }> {
  const input = tryOnSchema.parse(rawInput) as TryOnInput

  const photo = await getOwnedMedia(input.userPhotoId, userId)
  if (input.layers.length === 0) {
    throw new ApiError('INVALID_LAYERS', '至少加入一件单品', 422)
  }

  const clothingIds = [...new Set(input.layers.map((layer) => layer.clothingId))]
  const garments = await prisma.garment.findMany({
    where: { id: { in: clothingIds } },
    select: { id: true, ownerId: true, source: true, status: true },
  })

  if (garments.length !== clothingIds.length) {
    throw new ApiError('INVALID_LAYERS', '部分单品不存在或已下架', 422)
  }
  const notAllowed = garments.find(
    (garment) => garment.source !== 'PLATFORM' && garment.ownerId !== userId,
  )
  if (notAllowed) {
    throw new ApiError('FORBIDDEN', '包含无权使用的单品', 403)
  }

  const layers = input.layers as OutfitLayer[]

  let draftId = input.draftId ?? null
  if (draftId) {
    const draft = await prisma.outfitDraft.findFirst({ where: { id: draftId, userId } })
    if (!draft) throw new ApiError('NOT_FOUND', '草稿不存在', 404)
    await prisma.outfitDraft.update({
      where: { id: draftId },
      data: {
        userPhotoId: photo.id,
        layers: layers as unknown as Prisma.InputJsonValue,
        status: 'EDITING',
      },
    })
  } else {
    const draft = await prisma.outfitDraft.create({
      data: {
        userId,
        userPhotoId: photo.id,
        layers: layers as unknown as Prisma.InputJsonValue,
      },
    })
    draftId = draft.id
  }

  const task = await prisma.generationTask.create({
    data: {
      userId,
      type: 'VIRTUAL_TRYON',
      status: 'QUEUED',
      provider: 'MOCK',
      maxAttempts: 2,
      input: {
        userPhotoId: photo.id,
        layers,
        poseHint: input.poseHint ?? 'standing',
        draftId,
      } as unknown as Prisma.InputJsonValue,
    },
  })

  if (isSyncTaskMode()) {
    await runTryOnTask(task.id)
    const fresh = await prisma.generationTask.findUnique({
      where: { id: task.id },
      select: { status: true },
    })
    return {
      taskId: task.id,
      status: fresh?.status ?? 'SUCCEEDED',
      pollAfterMs: 0,
      draftId,
    }
  }

  enqueue(() => runTryOnTask(task.id))

  return { taskId: task.id, status: 'QUEUED', pollAfterMs: 1500, draftId }
}

export async function getTaskForUser(userId: string, taskId: string): Promise<TryOnTask> {
  const task = await prisma.generationTask.findFirst({ where: { id: taskId, userId } })
  if (!task) throw new ApiError('NOT_FOUND', '任务不存在', 404)
  return toTaskDto(task)
}

export async function runTryOnTask(taskId: string): Promise<void> {
  const task = await prisma.generationTask.findUnique({ where: { id: taskId } })
  if (!task || task.status !== 'QUEUED') return

  const input = task.input as unknown as StoredInput

  try {
    await transition(taskId, 'PREPROCESSING', 18, '读取照片与单品素材')

    const photo = await getOwnedMedia(input.userPhotoId, task.userId)
    const uniqueIds = [...new Set(input.layers.map((layer) => layer.clothingId))]
    const [bodyBuffer, garments] = await Promise.all([
      readMediaBuffer(photo),
      prisma.garment.findMany({
        where: { id: { in: uniqueIds } },
        include: { cutout: true },
      }),
    ])

    const entries = await Promise.all(
      garments.map(async (garment) => {
        if (!garment.cutoutId || !garment.cutout) {
          throw new ApiError('ITEM_IMAGE_MISSING', `「${garment.name}」缺少可用图片`, 422)
        }
        return [garment.id, await readMediaBuffer(garment.cutout)] as const
      }),
    )
    const buffers = new Map(entries)

    await transition(taskId, 'RUNNING', 48, 'AI 正在合成全身效果图')

    const compositeLayers: CompositeLayer[] = input.layers.flatMap((layer) => {
      const buffer = buffers.get(layer.clothingId)
      if (!buffer) return []
      return [
        {
          buffer,
          x: layer.x,
          y: layer.y,
          scale: layer.scale,
          rotation: layer.rotation,
          zIndex: layer.zIndex,
        },
      ]
    })

    const composed = await composeTryOn({ body: bodyBuffer, layers: compositeLayers })

    await transition(taskId, 'POSTPROCESSING', 84, '保存高清效果图')

    const resultAsset = await saveMedia({
      ownerId: task.userId,
      kind: 'RESULT',
      buffer: composed.buffer,
      mimeType: 'image/jpeg',
      width: composed.width,
      height: composed.height,
      visibility: 'PRIVATE',
      metadata: { provider: 'mock-composite', degraded: true },
    })

    const output: TaskOutput = {
      imageId: resultAsset.id,
      imageUrl: mediaUrl(resultAsset.id) as string,
      width: composed.width,
      height: composed.height,
      degraded: true,
      provider: 'mock-composite',
    }

    await prisma.generationTask.update({
      where: { id: taskId },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        attempts: task.attempts + 1,
        output: output as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    })
    await prisma.generationEvent.create({
      data: { taskId, status: 'SUCCEEDED', message: '生成完成（预览版）' },
    })

    if (input.draftId) {
      await prisma.outfitDraft.updateMany({
        where: { id: input.draftId, userId: task.userId },
        data: { resultImageId: resultAsset.id, status: 'GENERATED' },
      })
    }
  } catch (error) {
    const attempts = task.attempts + 1
    const code = error instanceof ApiError ? error.code : 'GENERATION_FAILED'
    const message = error instanceof Error ? error.message : '生成失败，请重试'
    const retryable = !(error instanceof ApiError && error.status < 500)

    if (retryable && attempts < task.maxAttempts) {
      await prisma.generationTask.update({
        where: { id: taskId },
        data: { status: 'QUEUED', attempts, errorCode: code, errorMessage: message, progress: 0 },
      })
      await prisma.generationEvent.create({
        data: { taskId, status: 'QUEUED', message: `第 ${attempts} 次失败，准备重试：${message}` },
      })
      if (isSyncTaskMode()) {
        await runTryOnTask(taskId)
        return
      }
      enqueue(() => runTryOnTask(taskId), 1200)
      return
    }

    console.error('[tryon] task failed', taskId, error)
    await prisma.generationTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        attempts,
        errorCode: code,
        errorMessage: message,
        finishedAt: new Date(),
      },
    })
    await prisma.generationEvent.create({
      data: { taskId, status: 'FAILED', message },
    })
  }
}
