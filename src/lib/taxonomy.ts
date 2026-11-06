import type {
  ClothingCategory,
  ClothingColor,
  ClothingSeason,
  ClothingStyle,
  OutfitLayer,
} from '@/types/studio'

export const CATEGORY_LABEL: Record<ClothingCategory, string> = {
  TOP: '上装',
  BOTTOM: '下装',
  DRESS: '连衣裙',
  OUTERWEAR: '外套',
  SHOES: '鞋',
  BAG: '包',
  ACCESSORY: '配饰',
}

export const CATEGORY_ORDER: ClothingCategory[] = [
  'TOP',
  'BOTTOM',
  'DRESS',
  'OUTERWEAR',
  'SHOES',
  'BAG',
  'ACCESSORY',
]

export const COLOR_LABEL: Record<ClothingColor, string> = {
  BLACK: '黑色',
  WHITE: '白色',
  GRAY: '灰色',
  BEIGE: '米色',
  BROWN: '棕色',
  RED: '红色',
  ORANGE: '橙色',
  YELLOW: '黄色',
  GREEN: '绿色',
  BLUE: '蓝色',
  NAVY: '藏青',
  PURPLE: '紫色',
  PINK: '粉色',
  GOLD: '金色',
  SILVER: '银色',
  MULTI: '多色',
}

export const COLOR_HEX: Record<ClothingColor, string> = {
  BLACK: '#1c1a17',
  WHITE: '#f3eee5',
  GRAY: '#9a958d',
  BEIGE: '#e0d0b6',
  BROWN: '#7a5638',
  RED: '#b3352c',
  ORANGE: '#d4713a',
  YELLOW: '#e0b23c',
  GREEN: '#5b7a52',
  BLUE: '#4a6f9b',
  NAVY: '#26344d',
  PURPLE: '#6d5590',
  PINK: '#e2a7ad',
  GOLD: '#c9a227',
  SILVER: '#c0c2c6',
  MULTI: '#b4552d',
}

export const COLOR_ORDER: ClothingColor[] = [
  'BLACK',
  'WHITE',
  'GRAY',
  'BEIGE',
  'BROWN',
  'RED',
  'ORANGE',
  'YELLOW',
  'GREEN',
  'BLUE',
  'NAVY',
  'PURPLE',
  'PINK',
  'GOLD',
  'SILVER',
  'MULTI',
]

export const STYLE_LABEL: Record<ClothingStyle, string> = {
  MINIMAL: '极简',
  CASUAL: '休闲',
  STREET: '街头',
  BUSINESS: '商务',
  SMART_CASUAL: '通勤',
  SPORTY: '运动',
  ROMANTIC: '浪漫',
  VINTAGE: '复古',
  Y2K: 'Y2K',
  KOREAN: '韩系',
  FRENCH: '法式',
  OUTDOOR: '户外',
  PREPPY: '学院',
  GOTHIC: '暗黑',
}

export const STYLE_ORDER: ClothingStyle[] = [
  'MINIMAL',
  'CASUAL',
  'SMART_CASUAL',
  'BUSINESS',
  'ROMANTIC',
  'FRENCH',
  'KOREAN',
  'STREET',
  'SPORTY',
  'VINTAGE',
  'PREPPY',
  'Y2K',
  'OUTDOOR',
  'GOTHIC',
]

export const SEASON_LABEL: Record<ClothingSeason, string> = {
  SPRING: '春',
  SUMMER: '夏',
  AUTUMN: '秋',
  WINTER: '冬',
  ALL_SEASON: '四季',
}

export const SEASON_ORDER: ClothingSeason[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ALL_SEASON']

/** 不同品类加入画布时的默认位置/大小（相对画布 0-1） */
export const DEFAULT_LAYER_TRANSFORM: Record<
  ClothingCategory,
  Pick<OutfitLayer, 'x' | 'y' | 'scale'>
> = {
  TOP: { x: 0.5, y: 0.35, scale: 0.4 },
  BOTTOM: { x: 0.5, y: 0.64, scale: 0.34 },
  DRESS: { x: 0.5, y: 0.5, scale: 0.46 },
  OUTERWEAR: { x: 0.5, y: 0.37, scale: 0.44 },
  SHOES: { x: 0.5, y: 0.9, scale: 0.22 },
  BAG: { x: 0.74, y: 0.58, scale: 0.16 },
  ACCESSORY: { x: 0.5, y: 0.16, scale: 0.16 },
}

export const MAX_LAYERS = 8

export const GENERATION_STAGE_COPY: Record<string, string> = {
  QUEUED: '正在排队',
  PREPROCESSING: '正在处理照片与单品',
  RUNNING: 'AI 正在为你试衣',
  POSTPROCESSING: '正在生成高清图',
  SUCCEEDED: '生成完成',
  FAILED: '生成失败',
  CANCELED: '已取消',
}
