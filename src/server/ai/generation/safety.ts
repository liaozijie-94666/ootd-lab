import { SafetyError } from './types'

const BLOCK_TERMS = [
  // 色情 / 未成年
  '裸体',
  '全裸',
  '色情',
  '性爱',
  '做爱',
  '幼女',
  '未成年',
  '儿童色情',
  'nude',
  'naked',
  'nsfw',
  'porn',
  'explicit',
  'child porn',
  'loli',
  // 暴力 / 违法
  '血腥',
  '肢解',
  '尸体',
  '斩首',
  '虐待',
  '枪击',
  '爆炸',
  '恐怖袭击',
  '毒品',
  '自杀',
  'gore',
  'decapitate',
  'corpse',
  'terrorist',
  'bomb',
  'drugs',
  'suicide',
]

export interface SafetyInput {
  scene?: string
  stylePrompt?: string
  styleSummary?: string
  metadata?: Record<string, unknown>
}

function textOf(input: SafetyInput): string {
  const metadataText = input.metadata
    ? Object.entries(input.metadata)
        .filter(([, value]) => typeof value === 'string')
        .map(([, value]) => String(value))
        .join(' ')
    : ''
  return [input.scene, input.stylePrompt, input.styleSummary, metadataText]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * 生成前文本安全校验：命中即拒绝，不进入任务队列。
 * 注意：negativePrompt 是"排除词"，不做拦截（例如用户写 nsfw 表示不要）。
 */
export function assertTextSafe(input: SafetyInput): void {
  const text = textOf(input)
  if (!text) return
  const matches = [...new Set(BLOCK_TERMS.filter((term) => text.includes(term.toLowerCase())))]
  if (matches.length > 0) throw new SafetyError(matches)
}

/**
 * 图片安全校验占位：默认 mock 通过。
 * 接入阿里云内容安全/腾讯云天御时实现真实调用，返回 REVIEW 时任务转人工。
 */
export async function assertImagesSafe(_urls: string[]): Promise<void> {
  const provider = process.env.IMAGE_SAFETY_PROVIDER ?? 'mock'
  if (provider === 'mock') return
  // 生产实现示例：调用第三方图片审核，命中则 throw new SafetyError([...])
}
