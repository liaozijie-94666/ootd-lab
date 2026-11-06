import { prisma } from '@/server/db'

export type ModerationDecision = 'PASS' | 'REVIEW' | 'BLOCK'

export interface TextModerationResult {
  decision: ModerationDecision
  matches: string[]
  labels: string[]
}

/**
 * 本地敏感词：BLOCK 直接拒绝，REVIEW 进入待审。
 * 生产可替换为阿里云内容安全 / 腾讯云天御，接口保持不变。
 */
export async function moderateText(...texts: string[]): Promise<TextModerationResult> {
  const haystack = texts.join('\n').toLowerCase()
  if (!haystack.trim()) return { decision: 'PASS', matches: [], labels: [] }

  const terms = await prisma.sensitiveTerm.findMany({ where: { enabled: true } })
  const hits = terms.filter((term) => haystack.includes(term.term.toLowerCase()))
  if (hits.length === 0) return { decision: 'PASS', matches: [], labels: [] }

  const block = hits.filter((term) => term.action === 'BLOCK')
  const decision: ModerationDecision = block.length > 0 ? 'BLOCK' : 'REVIEW'

  return {
    decision,
    matches: [...new Set(hits.map((term) => term.term))],
    labels: [...new Set(hits.map((term) => term.category))],
  }
}

export interface ImageModerationResult {
  decision: ModerationDecision
  labels: string[]
}

/**
 * 图片审核预留位：默认 mock 通过。
 * 接入服务后在 IMAGE_MODERATION_PROVIDER 分支里调用第三方审核 API。
 */
export async function moderateImages(_mediaIds: string[]): Promise<ImageModerationResult> {
  const provider = process.env.IMAGE_MODERATION_PROVIDER ?? 'mock'
  if (provider === 'mock') return { decision: 'PASS', labels: [] }
  return { decision: 'PASS', labels: [] }
}

export function excerpt(text: string, length = 90): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  return compact.length <= length ? compact : `${compact.slice(0, length)}…`
}
