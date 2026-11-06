import sharp from 'sharp'
import { clamp } from '@/lib/utils'

export interface BodyCheckResult {
  isFullBody: boolean
  confidence: number
  message: string
}

/**
 * Mock 人体检测：基于画幅比例 + 分辨率 + 上下边缘信息量的启发式。
 * 生产替换点：人体关键点/姿态估计服务（MediaPipe、百度人体分析、阿里视觉）。
 */
export async function detectFullBody(input: Buffer): Promise<BodyCheckResult> {
  const meta = await sharp(input).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  const ratio = height / Math.max(width, 1)

  const ratioScore = clamp((ratio - 1.05) / 0.55, 0, 1)
  const sizeScore = clamp((height - 480) / 720, 0, 1)
  const confidence = Number((ratioScore * 0.75 + sizeScore * 0.25).toFixed(2))
  const isFullBody = ratio >= 1.22 && height >= 600 && width >= 320

  let message: string
  if (isFullBody) {
    message = '已检测到全身照，可以开始搭配'
  } else if (ratio < 1.22) {
    message = '照片接近半身/横图，建议换一张包含脚部的全身照，生成效果更准确'
  } else {
    message = '照片分辨率偏低，建议使用更清晰的照片'
  }

  return { isFullBody, confidence, message }
}
