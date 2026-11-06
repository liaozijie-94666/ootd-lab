'use client'

import { useMemo, useState } from 'react'
import { Briefcase, CloudSun, Palette, Ruler, Sparkles, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/primitives'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  COLOR_HEX,
  COLOR_LABEL,
  COLOR_ORDER,
  STYLE_LABEL,
} from '@/lib/taxonomy'
import { cn } from '@/lib/utils'
import type { ClothingColor, ClothingStyle } from '@/types/studio'
import type { RecommendFormValues } from '@/types/recommend'

const SCENE_EXAMPLES = ['明天去海边约会', '周一互联网公司面试', '参加朋友婚礼', '秋冬通勤']

const STYLE_OPTIONS: ClothingStyle[] = [
  'MINIMAL',
  'CASUAL',
  'SMART_CASUAL',
  'BUSINESS',
  'ROMANTIC',
  'FRENCH',
  'KOREAN',
  'STREET',
]

const BUDGET_OPTIONS = [500, 1000, 1500, 3000]

const FORMALITY_LABELS = ['休闲', '日常', '通勤', '正式', '隆重']

export const DEFAULT_FORM_VALUES: RecommendFormValues = {
  scene: '',
  gender: 'PREFER_NOT_SAY',
  heightCm: '',
  weightKg: '',
  styles: [],
  budget: '',
  city: '',
  condition: '',
  tempC: '',
  avoidColors: [],
  formality: 0,
}

function toggle<T>(list: T[], value: T, max = 99): T[] {
  if (list.includes(value)) return list.filter((item) => item !== value)
  if (list.length >= max) return list
  return [...list, value]
}

export function RecommendForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial?: RecommendFormValues
  submitting: boolean
  onSubmit: (values: RecommendFormValues) => void
}) {
  const [values, setValues] = useState<RecommendFormValues>(initial ?? DEFAULT_FORM_VALUES)
  const [touched, setTouched] = useState(false)

  const sceneError = useMemo(() => {
    const length = values.scene.trim().length
    if (length === 0) return '请描述一下场景'
    if (length < 2) return '再多写两个字吧'
    if (length > 200) return '最多 200 字'
    return null
  }, [values.scene])

  const canSubmit = !sceneError && !submitting

  const update = <K extends keyof RecommendFormValues>(key: K, value: RecommendFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (!canSubmit) return
        onSubmit(values)
      }}
    >
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" />
          <Label className="text-sm font-medium text-ink">要去哪儿？</Label>
          <span className="ml-auto text-[11px] text-muted">必填</span>
        </div>

        <Textarea
          value={values.scene}
          rows={3}
          maxLength={220}
          placeholder="例如：明天去海边约会，想穿得轻盈一点，但海边风很大"
          className="mt-3 resize-none border-0 bg-paper px-4 py-3 text-[15px] leading-relaxed shadow-none focus-visible:ring-1"
          onChange={(event) => update('scene', event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={touched && Boolean(sceneError)}
          aria-describedby="scene-error"
        />

        <div className="mt-2 flex items-center justify-between">
          <div id="scene-error" className="text-[11px] text-danger">
            {touched && sceneError ? sceneError : ''}
          </div>
          <span className={cn('text-[11px]', values.scene.length > 200 ? 'text-danger' : 'text-muted')}>
            {values.scene.length}/200
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SCENE_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => update('scene', example)}
              className="rounded-full border border-line bg-paper px-3 py-1 text-[11px] text-ink-soft transition-colors hover:border-camel hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-camel" />
          <Label className="text-sm font-medium text-ink">关于你</Label>
          <span className="ml-auto text-[11px] text-muted">可选</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label>性别</Label>
            <Select
              value={values.gender}
              onChange={(event) => update('gender', event.target.value as RecommendFormValues['gender'])}
              className="h-10 w-full rounded-xl text-sm"
            >
              <option value="PREFER_NOT_SAY">不透露</option>
              <option value="FEMALE">女</option>
              <option value="MALE">男</option>
              <option value="NON_BINARY">非二元</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">身高 cm</Label>
            <Input
              id="height"
              inputMode="numeric"
              placeholder="165"
              value={values.heightCm}
              onChange={(event) => update('heightCm', event.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight">体重 kg</Label>
            <Input
              id="weight"
              inputMode="numeric"
              placeholder="52"
              value={values.weightKg}
              onChange={(event) => update('weightKg', event.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">城市</Label>
            <Input
              id="city"
              placeholder="上海"
              maxLength={20}
              value={values.city}
              onChange={(event) => update('city', event.target.value)}
            />
          </div>
        </div>

        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
          <Ruler className="size-3" />
          身高体重只用于比例建议，不做任何展示。
        </p>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-camel" />
          <Label className="text-sm font-medium text-ink">风格与预算</Label>
          <span className="ml-auto text-[11px] text-muted">最多 3 个风格</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STYLE_OPTIONS.map((style) => {
            const active = values.styles.includes(style)
            return (
              <button
                key={style}
                type="button"
                onClick={() => update('styles', toggle(values.styles, style, 3))}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs transition-colors',
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-paper text-ink-soft hover:border-camel hover:text-ink',
                )}
              >
                {STYLE_LABEL[style]}
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          <Label>预算</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BUDGET_OPTIONS.map((budget) => {
              const active = values.budget === String(budget)
              return (
                <button
                  key={budget}
                  type="button"
                  onClick={() => update('budget', active ? '' : String(budget))}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs transition-colors',
                    active
                      ? 'border-brand bg-brand-soft text-brand-strong'
                      : 'border-line bg-paper text-ink-soft hover:border-camel',
                  )}
                >
                  ¥{budget}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => update('budget', '')}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition-colors',
                values.budget === ''
                  ? 'border-brand bg-brand-soft text-brand-strong'
                  : 'border-line bg-paper text-ink-soft hover:border-camel',
              )}
            >
              不限
            </button>
          </div>
        </div>

        <div className="mt-4">
          <Label>禁忌颜色</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_ORDER.map((color) => {
              const active = values.avoidColors.includes(color)
              return (
                <button
                  key={color}
                  type="button"
                  title={COLOR_LABEL[color]}
                  aria-label={`禁忌色：${COLOR_LABEL[color]}`}
                  aria-pressed={active}
                  onClick={() => update('avoidColors', toggle<ClothingColor>(values.avoidColors, color, 6))}
                  className={cn(
                    'relative size-6 rounded-full border transition-transform',
                    active
                      ? 'scale-110 border-ink ring-2 ring-ink/20 ring-offset-1'
                      : 'border-black/10 hover:scale-105',
                  )}
                  style={{ backgroundColor: COLOR_HEX[color] }}
                >
                  {active ? (
                    <span className="absolute inset-0 grid place-items-center text-[10px] text-white mix-blend-difference">
                      ✓
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-2">
          <CloudSun className="size-4 text-camel" />
          <Label className="text-sm font-medium text-ink">天气与正式度</Label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>天气</Label>
            <Select
              value={values.condition}
              onChange={(event) =>
                update('condition', event.target.value as RecommendFormValues['condition'])
              }
              className="h-10 w-full rounded-xl text-sm"
            >
              <option value="">不限</option>
              <option value="SUNNY">晴</option>
              <option value="CLOUDY">多云</option>
              <option value="RAIN">雨</option>
              <option value="SNOW">雪</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="temp">温度 ℃</Label>
            <Input
              id="temp"
              inputMode="numeric"
              placeholder="28"
              value={values.tempC}
              onChange={(event) => update('tempC', event.target.value.replace(/[^\d-]/g, ''))}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <Label>场合正式程度</Label>
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <Briefcase className="size-3" />
              {values.formality === 0 ? '按场景自动判断' : FORMALITY_LABELS[values.formality - 1]}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {FORMALITY_LABELS.map((label, index) => {
              const level = index + 1
              const active = values.formality === level
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => update('formality', active ? 0 : level)}
                  className={cn(
                    'rounded-xl border py-2 text-[11px] transition-colors',
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-paper text-ink-soft hover:border-camel',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-muted">
            不选则按场景自动判断；再点一次已选项可恢复自动。
          </p>
        </div>
      </section>

      <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!canSubmit}>
        <Sparkles className="size-4" />
        生成我的穿搭方案
      </Button>
      <p className="pb-2 text-center text-[11px] text-muted">
        推荐单品来自站内真实衣橱；库存不足时会明确标注「AI 建议」。
      </p>
    </form>
  )
}
