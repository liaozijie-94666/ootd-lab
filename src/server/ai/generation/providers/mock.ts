import { BaseImageProvider } from '../base-provider'
import { loadImageBuffer } from '../assets'
import { ProviderError, type ProviderRequest, type ProviderSubmit } from '../types'
import { composeTryOn } from '@/server/imaging/composite'
import { composeLookbook } from '@/server/imaging/lookbook'

const DEFAULT_LAYERS = [
  { x: 0.5, y: 0.38, scale: 0.42, rotation: 0, zIndex: 1 },
  { x: 0.5, y: 0.64, scale: 0.34, rotation: 0, zIndex: 2 },
  { x: 0.5, y: 0.9, scale: 0.22, rotation: 0, zIndex: 3 },
  { x: 0.76, y: 0.58, scale: 0.16, rotation: 0, zIndex: 4 },
  { x: 0.5, y: 0.16, scale: 0.16, rotation: 0, zIndex: 5 },
]

interface LayerOverride {
  x?: number
  y?: number
  scale?: number
  rotation?: number
  zIndex?: number
}

/**
 * 本地合成供应商：无需任何 Key，用 sharp 叠图验证整条链路。
 * 生产保留为最终降级（degraded=true）。
 */
export class MockImageProvider extends BaseImageProvider {
  readonly id = 'mock' as const

  isConfigured(): boolean {
    return true
  }

  supports(_kind: 'tryon' | 'recommendation'): boolean {
    return true
  }

  async submit(request: ProviderRequest): Promise<ProviderSubmit> {
    const clothingBuffers = await Promise.all(
      request.clothingImageUrls.map((url) => loadImageBuffer(url)),
    )
    if (clothingBuffers.length === 0) {
      throw new ProviderError('INVALID_INPUT', '至少需要一件衣服', { retryable: false })
    }

    const overrides = Array.isArray(request.metadata?.layers)
      ? (request.metadata?.layers as LayerOverride[])
      : []

    const layers = clothingBuffers.map((buffer, index) => {
      const base = DEFAULT_LAYERS[index % DEFAULT_LAYERS.length]
      const override = overrides[index] ?? {}
      return {
        buffer,
        x: override.x ?? base.x,
        y: override.y ?? base.y,
        scale: override.scale ?? base.scale,
        rotation: override.rotation ?? base.rotation,
        zIndex: override.zIndex ?? base.zIndex + index,
      }
    })

    if (request.kind === 'tryon' || request.userPhotoUrl) {
      if (!request.userPhotoUrl) {
        throw new ProviderError('INVALID_INPUT', '试衣需要用户照片', { retryable: false })
      }
      const body = await loadImageBuffer(request.userPhotoUrl)
      const result = await composeTryOn({
        body,
        layers,
        width: request.width,
        height: request.height,
      })
      return {
        jobId: `mock-${Date.now()}`,
        status: 'succeeded',
        progress: 100,
        imageBuffer: result.buffer,
      }
    }

    const result = await composeLookbook({
      layers,
      width: request.width,
      height: request.height,
    })

    return {
      jobId: `mock-${Date.now()}`,
      status: 'succeeded',
      progress: 100,
      imageBuffer: result.buffer,
    }
  }
}
