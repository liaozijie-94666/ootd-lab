import { composeTryOn } from '@/server/imaging/composite'
import { composeLookbook, type LookbookLayer } from '@/server/imaging/lookbook'

export interface RecommendationImageInput {
  userPhoto?: Buffer
  layers: LookbookLayer[]
  scene: string
  imagePrompt: string
}

export interface RecommendationImageResult {
  buffer: Buffer
  width: number
  height: number
  provider: string
}

/**
 * 图像生成门面：对外只暴露一个方法，内部按是否有用户照片选择合成策略。
 * 接入 Fashn / Replicate 时替换本文件实现即可，调用方不感知。
 */
export const CompositeImageService = {
  async generateRecommendation(input: RecommendationImageInput): Promise<RecommendationImageResult> {
    if (input.userPhoto) {
      const result = await composeTryOn({ body: input.userPhoto, layers: input.layers })
      return { ...result, provider: 'mock-tryon-composite' }
    }

    const result = await composeLookbook({ layers: input.layers })
    return { ...result, provider: 'mock-lookbook' }
  },
}
