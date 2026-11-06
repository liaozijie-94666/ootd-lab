import sharp, { type OverlayOptions } from 'sharp'
import { clamp } from '@/lib/utils'

export interface CompositeLayer {
  buffer: Buffer
  x: number
  y: number
  scale: number
  rotation: number
  zIndex: number
}

export interface ComposeTryOnInput {
  body: Buffer
  layers: CompositeLayer[]
  width?: number
  height?: number
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

function watermarkSvg(width: number, height: number) {
  const boxWidth = 268
  const boxHeight = 46
  const x = width - boxWidth - 24
  const y = height - boxHeight - 24
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="23" fill="#17130f" fill-opacity="0.55" />
    <text x="${x + boxWidth / 2}" y="${y + 29}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" letter-spacing="1" fill="#ffffff" fill-opacity="0.92">OOTD LAB · AI PREVIEW</text>
  </svg>`
}

/**
 * 把用户照片 + 各图层服装合成为一张全身效果图。
 * 与前端画布共用归一化坐标（x/y/scale 相对画布宽高）。
 */
export async function composeTryOn({
  body,
  layers,
  width = 1024,
  height = 1365,
}: ComposeTryOnInput): Promise<{ buffer: Buffer; width: number; height: number }> {
  const base = await sharp(body)
    .rotate()
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 92 })
    .toBuffer()

  const composites: OverlayOptions[] = [{ input: base, left: 0, top: 0 }]

  const ordered = [...layers].sort((a, b) => a.zIndex - b.zIndex)

  for (const layer of ordered) {
    const targetWidth = Math.max(48, Math.round(width * clamp(layer.scale, 0.05, 1.2)))

    let buffer = await sharp(layer.buffer)
      .resize({ width: targetWidth, withoutEnlargement: false })
      .png()
      .toBuffer()

    if (Math.abs(layer.rotation) > 0.5) {
      buffer = await sharp(buffer)
        .rotate(layer.rotation, { background: TRANSPARENT })
        .png()
        .toBuffer()
    }

    let meta = await sharp(buffer).metadata()
    let layerWidth = meta.width ?? targetWidth
    let layerHeight = meta.height ?? targetWidth

    // 超出画布时等比缩小，避免 sharp 合成报错
    if (layerWidth > width || layerHeight > height) {
      const factor = Math.min(width / layerWidth, height / layerHeight)
      buffer = await sharp(buffer)
        .resize({ width: Math.floor(layerWidth * factor), height: Math.floor(layerHeight * factor), fit: 'inside' })
        .png()
        .toBuffer()
      meta = await sharp(buffer).metadata()
      layerWidth = meta.width ?? layerWidth
      layerHeight = meta.height ?? layerHeight
    }

    const left = Math.round(clamp(layer.x * width - layerWidth / 2, 0, Math.max(0, width - layerWidth)))
    const top = Math.round(clamp(layer.y * height - layerHeight / 2, 0, Math.max(0, height - layerHeight)))

    composites.push({ input: buffer, left, top })
  }

  composites.push({ input: Buffer.from(watermarkSvg(width, height)), left: 0, top: 0 })

  const output = await sharp({
    create: { width, height, channels: 3, background: { r: 250, g: 248, b: 244 } },
  })
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()

  return { buffer: output, width, height }
}
