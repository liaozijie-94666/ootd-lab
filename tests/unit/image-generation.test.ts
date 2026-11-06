import { describe, expect, it } from 'vitest'
import { buildPrompt } from '@/server/ai/generation/prompts'
import { assertTextSafe } from '@/server/ai/generation/safety'
import { SafetyError } from '@/server/ai/generation/types'

describe('image generation safety', () => {
  it('拦截违法/暴露场景描述', () => {
    expect(() => assertTextSafe({ scene: '海边裸体写真' })).toThrow(SafetyError)
  })

  it('允许正常场景，且不误伤 negative prompt 中的排除词', () => {
    expect(() =>
      assertTextSafe({
        scene: '明天去海边约会',
        stylePrompt: '法式、轻盈、亚麻长裙',
      }),
    ).not.toThrow()

    const built = buildPrompt({
      kind: 'recommendation',
      scene: '周末看展',
      negativePrompt: 'nsfw, nude, low quality',
    })
    expect(built.negativePrompt).toContain('nsfw')
  })
})

describe('prompt building', () => {
  it('限制尺寸范围并生成默认负面词', () => {
    const built = buildPrompt({
      kind: 'tryon',
      scene: '面试',
      width: 200,
      height: 4000,
      seed: 42,
    })
    expect(built.width).toBe(512)
    expect(built.height).toBe(1536)
    expect(built.negativePrompt).toContain('low quality')
    expect(built.seed).toBe(42)
  })

  it('有 stylePrompt 时优先使用', () => {
    const built = buildPrompt({
      kind: 'recommendation',
      stylePrompt: 'editorial lookbook, white linen dress, seaside',
    })
    expect(built.prompt).toContain('white linen dress')
  })
})
