import sharp, { type OverlayOptions } from 'sharp'
import { clamp } from '@/lib/utils'

export interface LookbookLayer {
  buffer: Buffer
  x: number
  y: number
  scale: number
  rotation: number
  zIndex: number
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

function backdropSvg(width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stop-color="#f4eee2" />
        <stop offset="55%" stop-color="#e9dfcd" />
        <stop offset="100%" stop-color="#d9cab3" />
      </linearGradient>
      <radialGradient id="halo" cx="50%" cy="42%" r="52%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <ellipse cx="${width / 2}" cy="${height * 0.56}" rx="${width * 0.46}" ry="${height * 0.42}" fill="url(#halo)" />
    <ellipse cx="${width / 2}" cy="${height * 0.9}" rx="${width * 0.3}" ry="${height * 0.035}" fill="#17130f" fill-opacity="0.07" />
  </svg>`
}

function frameSvg(width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="28" y="28" width="${width - 56}" height="${height - 56}" fill="none" stroke="#17130f" stroke-opacity="0.12" stroke-width="2" rx="6" />
    <text x="64" y="88" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="8" fill="#17130f" fill-opacity="0.72">OOTD LAB</text>
    <text x="64" y="116" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="4" fill="#17130f" fill-opacity="0.38">AI STYLING LOOKBOOK</text>
    <line x1="64" y1="136" x2="248" y2="136" stroke="#17130f" stroke-opacity="0.18" stroke-width="1" />
  </svg>`
}

function watermarkSvg(width: number, height: number) {
  const boxWidth = 286
  const boxHeight = 46
  const x = width - boxWidth - 24
  const y = height - boxHeight - 24
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="23" fill="#17130f" fill-opacity="0.55" />
    <text x="${x + boxWidth / 2}" y="${y + 29}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" letter-spacing="1" fill="#ffffff" fill-opacity="0.92">OOTD LAB · AI LOOKBOOK</text>
  </svg>`
}

/**
 * 无用户照片时的「穿搭画报」：按推荐图层把单品叠成一张 3:4 的 lookbook。
 * 与画布共用归一化坐标，保证前端预览与最终图一致。
 */
export async function composeLookbook({
  layers,
  width = 1024,
  height = 1365,
}: {
  layers: LookbookLayer[]
  width?: number
  height?: number
}): Promise<{ buffer: Buffer; width: number; height: number }> {
  const composites: OverlayOptions[] = [
    { input: Buffer.from(backdropSvg(width, height)), left: 0, top: 0 },
    { input: Buffer.from(frameSvg(width, height)), left: 0, top: 0 },
  ]

  const ordered = [...layers].sort((a, b) => a.zIndex - b.zIndex)

  for (const layer of ordered) {
    const targetWidth = Math.max(
      48,
      Math.round(width * clamp(layer.scale * 0.78, 0.04, 1.2)),
    )

    let buffer = await sharp(layer.buffer)
      .resize({ width: targetWidth, withoutEnlargement: false })
      .png()
      .toBuffer()

    if (Math.abs(layer.rotation) > 0.5) {
      buffer = await sharp(buffer).rotate(layer.rotation, { background: TRANSPARENT }).png().toBuffer()
    }

    let meta = await sharp(buffer).metadata()
    let layerWidth = meta.width ?? targetWidth
    let layerHeight = meta.height ?? targetWidth

    if (layerWidth > width || layerHeight > height) {
      const factor = Math.min(width / layerWidth, height / layerHeight)
      buffer = await sharp(buffer)
        .resize({
          width: Math.floor(layerWidth * factor),
          height: Math.floor(layerHeight * factor),
          fit: 'inside',
        })
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

  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 246, g: 240, b: 230 } },
  })
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()

  return { buffer, width, height }
}
