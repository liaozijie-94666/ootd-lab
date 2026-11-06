import { describe, expect, it } from 'vitest'
import { generateStylistDraft } from '@/server/ai/registry'
import { normalizeDraft } from '@/server/ai/schema'
import type { CandidateItem, StylistContext, StylistDraft, StylistProvider } from '@/server/ai/types'

function candidate(overrides: Partial<CandidateItem> = {}): CandidateItem {
  return {
    id: 'g1',
    name: '白色亚麻连衣裙',
    category: 'DRESS',
    color: 'WHITE',
    colorHex: '#f3eee5',
    styles: ['FRENCH'],
    style: 'FRENCH',
    seasons: ['SUMMER'],
    season: 'SUMMER',
    material: '亚麻',
    brand: 'COS',
    price: 690,
    currency: 'CNY',
    purchaseUrl: 'https://example.com/g1',
    imageUrl: '/api/media/g1',
    cutoutUrl: '/api/media/g1',
    popularity: 50,
    ...overrides,
  }
}

function context(candidates: CandidateItem[]): StylistContext {
  return {
    scene: '明天去海边约会',
    parsed: {
      occasion: 'DATE',
      formality: 2,
      season: 'SUMMER',
      weather: { condition: 'SUNNY', tempC: 28 },
      keywords: ['海边'],
      riskFlags: ['sun'],
    },
    profile: {
      gender: 'FEMALE',
      styles: ['FRENCH'],
      avoidColors: [],
      formality: 2,
    },
    candidates,
    byCategory: { DRESS: candidates },
    excludeIds: [],
    seed: 1,
  }
}

function validDraft(): StylistDraft {
  return {
    styleSummary: '海风法式 · 白裙',
    reason: '海边风大日照强，亚麻长裙透气又抗风，浅色在强光下更干净。',
    items: [
      {
        clothingId: 'g1',
        name: '白色亚麻连衣裙',
        category: 'DRESS',
        reason: '亚麻透气，及踝长度抗风',
      },
      {
        clothingId: null,
        name: '细带凉鞋',
        category: 'SHOES',
        reason: '露脚背的鞋型能把腿延长一截',
      },
    ],
    imagePrompt: 'editorial lookbook, white linen dress, seaside, soft light, 3:4',
    tips: ['把腰线收好'],
    avoidTips: ['避免大面积黑色'],
  }
}

class RetryProvider implements StylistProvider {
  readonly id = 'fake'
  readonly model = 'fake-1'
  calls = 0

  isConfigured() {
    return true
  }

  async generate(): Promise<StylistDraft> {
    this.calls += 1
    if (this.calls === 1) {
      // 第一次返回非法结构（items 为空），触发 Schema 失败与重试
      return { ...validDraft(), items: [] }
    }
    return validDraft()
  }
}

class BrokenProvider implements StylistProvider {
  readonly id = 'broken'
  readonly model = 'broken-1'

  isConfigured() {
    return true
  }

  async generate(): Promise<StylistDraft> {
    return { ...validDraft(), items: [] }
  }
}

describe('AI recommendation reliability', () => {
  it('重试一次后接受合法 JSON', async () => {
    const provider = new RetryProvider()
    const result = await generateStylistDraft(context([candidate()]), provider)

    expect(provider.calls).toBe(2)
    expect(result.retried).toBe(true)
    expect(result.provider).toBe('fake')
    expect(result.items.length).toBeGreaterThanOrEqual(2)
  })

  it('两次失败后降级到规则引擎', async () => {
    const result = await generateStylistDraft(context([candidate()]), new BrokenProvider())

    expect(result.provider).toBe('rule-fallback')
    expect(result.items.length).toBeGreaterThanOrEqual(2)
  })

  it('未知 clothingId 被标记为 AI 建议且不保留价格', () => {
    const draft: StylistDraft = {
      ...validDraft(),
      items: [
        {
          clothingId: 'hallucinated-id',
          name: '幻觉托特包',
          category: 'BAG',
          price: 100,
          purchaseUrl: 'https://fake.example',
          reason: '看起来很适合海边，但数据库里并不存在',
        },
        {
          clothingId: 'g1',
          name: '白色亚麻连衣裙',
          category: 'DRESS',
          reason: '亚麻透气，及风',
        },
      ],
    }

    const items = normalizeDraft(draft, context([candidate()]))
    const hallucinated = items.find((item) => item.name === '幻觉托特包')

    expect(hallucinated?.isAiSuggested).toBe(true)
    expect(hallucinated?.price).toBeNull()
    expect(hallucinated?.purchaseUrl).toBeNull()
    expect(items.some((item) => item.category === 'SHOES')).toBe(true)
  })
})
