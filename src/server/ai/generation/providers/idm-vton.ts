import { ReplicateProvider } from './replicate'
import type { ProviderRequest } from '../types'
import type { ImageGenerationKind } from '@/types/image-generation'

/**
 * IDM-VTON：Replicate 上最常用的虚拟试衣模型。
 * 与 ReplicateProvider 共用任务协议，仅输入字段不同。
 */
export class IdmVtonProvider extends ReplicateProvider {
  readonly id = 'idm-vton' as const
  protected get versionEnv(): string {
    return 'REPLICATE_IDM_VTON_VERSION'
  }

  supports(kind: ImageGenerationKind): boolean {
    return kind === 'tryon'
  }

  protected buildInput(request: ProviderRequest): Record<string, unknown> {
    return {
      human_img: request.userPhotoUrl,
      garm_img: request.clothingImageUrls[0],
      garment_des: request.styleSummary || request.scene || 'fashion garment',
      category: 'upper_body',
      seed: request.seed,
      steps: 30,
      guidance_scale: 2,
      ...(request.metadata ?? {}),
    }
  }
}
