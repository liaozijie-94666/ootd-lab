import type { ClothingCategory } from '@/types/studio'

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/** 以 #rrggbb 为基准调整明度：amount ∈ [-1, 1] */
function shade(hex: string, amount: number): string {
  const normalized = hex.replace('#', '')
  const num = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  const target = amount >= 0 ? 255 : 0
  const ratio = Math.abs(amount)
  const mix = (channel: number) => clampChannel(channel + (target - channel) * ratio)
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const SHAPES: Record<Exclude<ClothingCategory, 'BOTTOM'>, string> = {
  TOP: `
    <path d="M206 120 L262 96 Q300 120 338 96 L394 120 L494 206 L440 276 L404 242 L404 552 Q300 582 196 552 L196 242 L160 276 L106 206 Z" />
    <path d="M262 96 Q300 142 338 96" fill="none" stroke-width="8" opacity="0.35" />
    <path d="M206 120 L262 96 L300 150 L338 96 L394 120 L360 150 L300 190 L240 150 Z" opacity="0.10" fill="#ffffff" stroke="none" />
  `,
  DRESS: `
    <path d="M228 110 L372 110 L388 248 L452 700 Q300 740 148 700 L212 248 Z" />
    <path d="M228 110 Q300 150 372 110" fill="none" stroke-width="10" opacity="0.35" />
    <path d="M212 248 Q300 272 388 248" fill="none" stroke-width="8" opacity="0.30" />
    <path d="M252 130 L300 176 L348 130 L338 232 L300 210 L262 232 Z" opacity="0.10" fill="#ffffff" stroke="none" />
  `,
  OUTERWEAR: `
    <path d="M206 120 L262 96 L300 172 L296 612 L196 600 L196 242 L160 276 L106 206 Z" />
    <path d="M394 120 L338 96 L300 172 L304 612 L404 600 L404 242 L440 276 L494 206 Z" />
    <path d="M262 96 L300 172 L338 96" fill="none" stroke-width="8" opacity="0.35" />
    <path d="M196 380 L196 600" fill="none" stroke-width="6" opacity="0.25" />
    <path d="M404 380 L404 600" fill="none" stroke-width="6" opacity="0.25" />
    <circle cx="330" cy="420" r="9" opacity="0.35" />
    <circle cx="330" cy="500" r="9" opacity="0.35" />
  `,
  SHOES: `
    <path d="M110 520 Q110 470 160 470 L250 470 L296 540 Q306 574 262 578 L140 578 Q108 578 108 548 Z" />
    <path d="M310 520 Q310 470 360 470 L450 470 L496 540 Q506 574 462 578 L340 578 Q308 578 308 548 Z" />
    <path d="M108 552 L262 578" fill="none" stroke-width="10" opacity="0.35" />
    <path d="M308 552 L462 578" fill="none" stroke-width="10" opacity="0.35" />
    <path d="M150 486 L246 486" fill="none" stroke-width="12" opacity="0.18" />
    <path d="M350 486 L446 486" fill="none" stroke-width="12" opacity="0.18" />
  `,
  BAG: `
    <rect x="180" y="300" width="240" height="250" rx="28" />
    <path d="M230 300 Q230 198 300 198 Q370 198 370 300" fill="none" stroke-width="18" />
    <path d="M210 352 L390 352" fill="none" stroke-width="8" opacity="0.25" />
    <rect x="282" y="392" width="36" height="26" rx="8" opacity="0.35" />
  `,
  ACCESSORY: `
    <rect x="118" y="330" width="152" height="108" rx="46" />
    <rect x="330" y="330" width="152" height="108" rx="46" />
    <path d="M270 372 Q300 350 330 372" fill="none" stroke-width="14" />
    <path d="M118 358 L66 336" fill="none" stroke-width="13" />
    <path d="M482 358 L534 336" fill="none" stroke-width="13" />
    <path d="M150 352 Q170 340 196 340" fill="none" stroke-width="10" opacity="0.35" stroke="#ffffff" />
    <path d="M362 352 Q382 340 408 340" fill="none" stroke-width="10" opacity="0.35" stroke="#ffffff" />
  `,
}

const BOTTOM_SHAPES = {
  pants: `
    <path d="M202 110 L398 110 L388 300 L362 700 L294 700 L302 396 L298 700 L230 700 L204 300 Z" />
    <path d="M202 138 L398 138" fill="none" stroke-width="10" opacity="0.30" />
    <path d="M300 170 L300 330" fill="none" stroke-width="6" opacity="0.25" />
    <path d="M292 700 L292 396" fill="none" stroke-width="5" opacity="0.20" />
    <path d="M310 700 L310 396" fill="none" stroke-width="5" opacity="0.20" />
  `,
  skirt: `
    <path d="M208 120 L392 120 L420 420 L470 700 Q300 738 130 700 L180 420 Z" />
    <path d="M208 150 L392 150" fill="none" stroke-width="10" opacity="0.30" />
    <path d="M300 150 L300 714" fill="none" stroke-width="5" opacity="0.18" />
    <path d="M232 420 L246 712" fill="none" stroke-width="5" opacity="0.12" />
    <path d="M368 420 L354 712" fill="none" stroke-width="5" opacity="0.12" />
  `,
}

export interface GarmentArtOptions {
  category: ClothingCategory
  color: string
  subCategory?: string | null
}

/**
 * 生成矢量服装图（用于种子数据与占位图）。
 * 输出 600x800 透明底 SVG，由 sharp 栅格化为 PNG。
 */
export function garmentSvg({ category, color, subCategory }: GarmentArtOptions): string {
  const base = color.startsWith('#') ? color : '#b4552d'
  const dark = shade(base, -0.35)
  const light = shade(base, 0.25)
  const shape = category === 'BOTTOM'
    ? (subCategory === 'skirt' ? BOTTOM_SHAPES.skirt : BOTTOM_SHAPES.pants)
    : SHAPES[category]

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="fabric" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${light}" />
      <stop offset="55%" stop-color="${base}" />
      <stop offset="100%" stop-color="${dark}" />
    </linearGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#17130f" flood-opacity="0.12" />
    </filter>
  </defs>
  <g fill="url(#fabric)" stroke="${dark}" stroke-width="4" stroke-opacity="0.45" filter="url(#soft)">
    ${shape}
  </g>
</svg>`
}
