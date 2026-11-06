import sharp from 'sharp'

/**
 * Mock 去背景：近白背景阈值 + 软边羽化 + 自动裁切。
 * 生产替换点：remove.bg / BRIA / 自建分割模型，输出同为透明 PNG。
 */
export async function removeBackground(input: Buffer): Promise<Buffer> {
  const base = sharp(input).rotate()

  let trimmed: Buffer
  try {
    trimmed = await base.trim({ threshold: 14 }).toBuffer()
  } catch {
    trimmed = await base.toBuffer()
  }

  const { data, info } = await sharp(trimmed)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels
  const pixels = info.width * info.height

  for (let i = 0; i < pixels; i += 1) {
    const offset = i * channels
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    const min = Math.min(r, g, b)
    const max = Math.max(r, g, b)
    const saturation = max - min

    if (min > 238 && saturation < 16) {
      data[offset + 3] = 0
    } else if (min > 212 && saturation < 26) {
      const t = (min - 212) / 26
      data[offset + 3] = Math.round(data[offset + 3] * (1 - t * 0.92))
    }
  }

  let cutout = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png({ compressionLevel: 9 })

  const metadata = await cutout.metadata()
  if ((metadata.width ?? 0) > 900) {
    cutout = cutout.resize({ width: 900, withoutEnlargement: true })
  }

  return cutout.png().toBuffer()
}
