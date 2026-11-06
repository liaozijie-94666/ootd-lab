export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

function toBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片处理失败'))),
      'image/jpeg',
      quality,
    )
  })
}

/** 按裁剪框截取（坐标基于原图） */
export async function cropImage(src: string, area: CropArea): Promise<Blob> {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(area.width))
  canvas.height = Math.max(1, Math.round(area.height))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas')

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return toBlob(canvas)
}

/** 顺时针旋转 90°，返回新的 Blob 与 ObjectURL */
export async function rotateImage90(src: string): Promise<Blob> {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = image.height
  canvas.height = image.width
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas')

  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)

  return toBlob(canvas)
}

export function revokeObjectUrl(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}
