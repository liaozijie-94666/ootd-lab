import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { hash } from 'bcryptjs'
import sharp from 'sharp'
import type { PrismaClient } from '@prisma/client'
import { garmentSvg } from '@/server/imaging/garment-art'
import { storage } from '@/server/storage'
import { COLOR_HEX } from '@/lib/taxonomy'
import type { ClothingCategory, ClothingColor, ClothingSeason, ClothingStyle } from '@/types/studio'

interface SeedItem {
  name: string
  category: ClothingCategory
  color: ClothingColor
  style: ClothingStyle
  season: ClothingSeason
  price: number
  brand: string
  material: string
  subCategory?: string
}

const BRANDS = [
  'UNIQLO',
  'COS',
  'ZARA',
  'Massimo Dutti',
  "Levi's",
  'Nike',
  'Clarks',
  'Dr. Martens',
  'New Balance',
  'COACH',
  'Gentle Monster',
  'Dickies',
  'The North Face',
  'Lacoste',
  '独立设计师',
]

const ITEMS: SeedItem[] = [
  // 上装 10
  { name: '白色棉质基础 T 恤', category: 'TOP', color: 'WHITE', style: 'CASUAL', season: 'ALL_SEASON', price: 99, brand: 'UNIQLO', material: '纯棉' },
  { name: '法式泡泡袖衬衫', category: 'TOP', color: 'WHITE', style: 'FRENCH', season: 'SPRING', price: 399, brand: 'COS', material: '棉' },
  { name: '黑色高领针织衫', category: 'TOP', color: 'BLACK', style: 'MINIMAL', season: 'WINTER', price: 499, brand: 'COS', material: '羊毛' },
  { name: '浅蓝条纹衬衫', category: 'TOP', color: 'BLUE', style: 'SMART_CASUAL', season: 'SPRING', price: 359, brand: 'Massimo Dutti', material: '棉' },
  { name: '米色短款西装马甲', category: 'TOP', color: 'BEIGE', style: 'BUSINESS', season: 'SUMMER', price: 459, brand: 'ZARA', material: '聚酯纤维' },
  { name: '灰色宽松卫衣', category: 'TOP', color: 'GRAY', style: 'STREET', season: 'AUTUMN', price: 299, brand: 'UNIQLO', material: '棉' },
  { name: '酒红色丝质吊带', category: 'TOP', color: 'RED', style: 'ROMANTIC', season: 'SUMMER', price: 599, brand: '独立设计师', material: '真丝' },
  { name: '藏青针织 Polo', category: 'TOP', color: 'NAVY', style: 'PREPPY', season: 'SPRING', price: 429, brand: 'Lacoste', material: '棉' },
  { name: '白色荷叶边衬衫', category: 'TOP', color: 'WHITE', style: 'ROMANTIC', season: 'SPRING', price: 389, brand: 'ZARA', material: '雪纺' },
  { name: '鹅黄短袖针织', category: 'TOP', color: 'YELLOW', style: 'KOREAN', season: 'SUMMER', price: 329, brand: '独立设计师', material: '冰丝' },

  // 下装 9
  { name: '黑色直筒西裤', category: 'BOTTOM', color: 'BLACK', style: 'BUSINESS', season: 'ALL_SEASON', price: 499, brand: 'COS', material: '羊毛混纺' },
  { name: '浅蓝直筒牛仔裤', category: 'BOTTOM', color: 'BLUE', style: 'CASUAL', season: 'ALL_SEASON', price: 399, brand: "Levi's", material: '牛仔' },
  { name: '米色高腰阔腿裤', category: 'BOTTOM', color: 'BEIGE', style: 'SMART_CASUAL', season: 'SUMMER', price: 429, brand: 'UNIQLO', material: '天丝' },
  { name: '黑色百褶短裙', category: 'BOTTOM', color: 'BLACK', style: 'PREPPY', season: 'SPRING', price: 299, brand: 'ZARA', material: '聚酯纤维', subCategory: 'skirt' },
  { name: '白色缎面半身裙', category: 'BOTTOM', color: 'WHITE', style: 'ROMANTIC', season: 'SUMMER', price: 459, brand: 'COS', material: '缎面', subCategory: 'skirt' },
  { name: '卡其工装裤', category: 'BOTTOM', color: 'BEIGE', style: 'STREET', season: 'AUTUMN', price: 499, brand: 'Dickies', material: '棉' },
  { name: '深灰运动束脚裤', category: 'BOTTOM', color: 'GRAY', style: 'SPORTY', season: 'AUTUMN', price: 329, brand: 'Nike', material: '涤纶' },
  { name: '棕色灯芯绒长裤', category: 'BOTTOM', color: 'BROWN', style: 'VINTAGE', season: 'WINTER', price: 459, brand: '独立设计师', material: '灯芯绒' },
  { name: '藏青西装短裤', category: 'BOTTOM', color: 'NAVY', style: 'BUSINESS', season: 'SUMMER', price: 359, brand: 'Massimo Dutti', material: '羊毛' },

  // 连衣裙 6
  { name: '白色亚麻收腰连衣裙', category: 'DRESS', color: 'WHITE', style: 'FRENCH', season: 'SUMMER', price: 690, brand: 'COS', material: '亚麻' },
  { name: '黑色缎面吊带长裙', category: 'DRESS', color: 'BLACK', style: 'ROMANTIC', season: 'SUMMER', price: 799, brand: 'ZARA', material: '缎面' },
  { name: '碎花雪纺连衣裙', category: 'DRESS', color: 'MULTI', style: 'ROMANTIC', season: 'SPRING', price: 459, brand: '独立设计师', material: '雪纺' },
  { name: '藏青衬衫式连衣裙', category: 'DRESS', color: 'NAVY', style: 'SMART_CASUAL', season: 'ALL_SEASON', price: 599, brand: 'Massimo Dutti', material: '棉' },
  { name: '米色针织长裙', category: 'DRESS', color: 'BEIGE', style: 'KOREAN', season: 'AUTUMN', price: 529, brand: '独立设计师', material: '羊毛' },
  { name: '红色丝绒礼服裙', category: 'DRESS', color: 'RED', style: 'VINTAGE', season: 'WINTER', price: 1299, brand: '独立设计师', material: '丝绒' },

  // 外套 8
  { name: '卡其经典风衣', category: 'OUTERWEAR', color: 'BEIGE', style: 'SMART_CASUAL', season: 'AUTUMN', price: 1299, brand: 'COS', material: '棉' },
  { name: '黑色短款皮衣', category: 'OUTERWEAR', color: 'BLACK', style: 'STREET', season: 'AUTUMN', price: 1599, brand: 'ZARA', material: '皮革' },
  { name: '米色羊毛大衣', category: 'OUTERWEAR', color: 'BEIGE', style: 'MINIMAL', season: 'WINTER', price: 1899, brand: 'COS', material: '羊毛' },
  { name: '水洗牛仔外套', category: 'OUTERWEAR', color: 'BLUE', style: 'CASUAL', season: 'SPRING', price: 599, brand: "Levi's", material: '牛仔' },
  { name: '灰色西装外套', category: 'OUTERWEAR', color: 'GRAY', style: 'BUSINESS', season: 'ALL_SEASON', price: 899, brand: 'Massimo Dutti', material: '羊毛' },
  { name: '军绿工装夹克', category: 'OUTERWEAR', color: 'GREEN', style: 'OUTDOOR', season: 'AUTUMN', price: 799, brand: 'The North Face', material: '尼龙' },
  { name: '白色针织开衫', category: 'OUTERWEAR', color: 'WHITE', style: 'KOREAN', season: 'SPRING', price: 459, brand: 'UNIQLO', material: '棉' },
  { name: '棕色格纹西装', category: 'OUTERWEAR', color: 'BROWN', style: 'VINTAGE', season: 'WINTER', price: 999, brand: '独立设计师', material: '羊毛' },

  // 鞋 6
  { name: '经典白色小白鞋', category: 'SHOES', color: 'WHITE', style: 'CASUAL', season: 'ALL_SEASON', price: 499, brand: 'Nike', material: '皮革' },
  { name: '黑色乐福鞋', category: 'SHOES', color: 'BLACK', style: 'PREPPY', season: 'ALL_SEASON', price: 699, brand: 'Clarks', material: '皮革' },
  { name: '米色细带凉鞋', category: 'SHOES', color: 'BEIGE', style: 'ROMANTIC', season: 'SUMMER', price: 459, brand: 'ZARA', material: '皮革' },
  { name: '黑色马丁短靴', category: 'SHOES', color: 'BLACK', style: 'STREET', season: 'AUTUMN', price: 899, brand: 'Dr. Martens', material: '皮革' },
  { name: '棕色切尔西靴', category: 'SHOES', color: 'BROWN', style: 'VINTAGE', season: 'WINTER', price: 1099, brand: 'Clarks', material: '皮革' },
  { name: '白色厚底运动鞋', category: 'SHOES', color: 'WHITE', style: 'SPORTY', season: 'SPRING', price: 799, brand: 'New Balance', material: '网布' },

  // 包 5
  { name: '草编托特包', category: 'BAG', color: 'BEIGE', style: 'ROMANTIC', season: 'SUMMER', price: 299, brand: 'ZARA', material: '草编' },
  { name: '黑色链条包', category: 'BAG', color: 'BLACK', style: 'MINIMAL', season: 'ALL_SEASON', price: 1599, brand: 'COACH', material: '皮革' },
  { name: '棕色腋下包', category: 'BAG', color: 'BROWN', style: 'VINTAGE', season: 'AUTUMN', price: 899, brand: '独立设计师', material: '皮革' },
  { name: '白色帆布托特', category: 'BAG', color: 'WHITE', style: 'CASUAL', season: 'SUMMER', price: 129, brand: 'UNIQLO', material: '帆布' },
  { name: '银色腋下包', category: 'BAG', color: 'SILVER', style: 'Y2K', season: 'ALL_SEASON', price: 499, brand: 'ZARA', material: '合成革' },

  // 配饰 4
  { name: '金色细框墨镜', category: 'ACCESSORY', color: 'GOLD', style: 'Y2K', season: 'SUMMER', price: 199, brand: 'Gentle Monster', material: '金属' },
  { name: '珍珠耳夹', category: 'ACCESSORY', color: 'WHITE', style: 'ROMANTIC', season: 'ALL_SEASON', price: 89, brand: '独立设计师', material: '珍珠' },
  { name: '黑色针织帽', category: 'ACCESSORY', color: 'BLACK', style: 'STREET', season: 'WINTER', price: 129, brand: 'UNIQLO', material: '羊毛' },
  { name: '棕色真皮腰带', category: 'ACCESSORY', color: 'BROWN', style: 'VINTAGE', season: 'ALL_SEASON', price: 299, brand: 'Massimo Dutti', material: '皮革' },
]

function slugifyBrand(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'indie'
}

export async function seed(prisma: PrismaClient): Promise<void> {
  const [demoPasswordHash, adminPasswordHash] = await Promise.all([
    hash('Demo1234!', 12),
    hash('Admin1234!', 12),
  ])

  const demo = await prisma.user.upsert({
    where: { email: 'demo@ootd.local' },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: 'demo@ootd.local',
      handle: 'demo',
      name: '小美',
      passwordHash: demoPasswordHash,
      profile: {
        create: {
          displayName: '小美',
          gender: 'FEMALE',
          heightCm: 165,
          weightKg: 52,
          city: '上海',
          stylePrefs: ['FRENCH', 'MINIMAL'],
          avoidedColors: ['BLACK'],
        },
      },
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@ootd.local' },
    update: { role: 'ADMIN', passwordHash: adminPasswordHash },
    create: {
      email: 'admin@ootd.local',
      handle: 'admin',
      name: '管理员',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
    },
  })

  const SENSITIVE_TERMS: Array<{ term: string; category: string; action: 'BLOCK' | 'REVIEW' }> = [
    { term: '代购', category: 'ad', action: 'BLOCK' },
    { term: '加微信', category: 'ad', action: 'BLOCK' },
    { term: '私聊', category: 'ad', action: 'REVIEW' },
    { term: '刷单', category: 'fraud', action: 'BLOCK' },
    { term: '返利', category: 'fraud', action: 'BLOCK' },
    { term: '博彩', category: 'illegal', action: 'BLOCK' },
    { term: '赌场', category: 'illegal', action: 'BLOCK' },
    { term: '诈骗', category: 'fraud', action: 'BLOCK' },
    { term: '传销', category: 'fraud', action: 'BLOCK' },
    { term: '办证', category: 'illegal', action: 'BLOCK' },
    { term: '枪支', category: 'illegal', action: 'BLOCK' },
    { term: '毒品', category: 'illegal', action: 'BLOCK' },
    { term: '色情', category: 'porn', action: 'BLOCK' },
    { term: '裸聊', category: 'porn', action: 'BLOCK' },
    { term: '人肉', category: 'harassment', action: 'BLOCK' },
    { term: '傻逼', category: 'harassment', action: 'BLOCK' },
    { term: '去死', category: 'harassment', action: 'BLOCK' },
    { term: '贷款', category: 'finance', action: 'REVIEW' },
    { term: '催收', category: 'finance', action: 'REVIEW' },
    { term: '辱骂', category: 'harassment', action: 'REVIEW' },
  ]

  for (const item of SENSITIVE_TERMS) {
    await prisma.sensitiveTerm.upsert({
      where: { term: item.term },
      update: { category: item.category, action: item.action, enabled: true },
      create: item,
    })
  }

  const existingCount = await prisma.garment.count()
  if (existingCount === 0) {
    await seedCatalog(prisma, demo.id)
  } else {
    console.log(`[seed] 已存在 ${existingCount} 件单品，跳过旧种子`)
  }

  await seedRealisticCatalog(prisma, demo.id)
  await seedCommunity(prisma, demo.id)
}

async function seedCatalog(prisma: PrismaClient, demoId: string): Promise<void> {

  const brandIds = new Map<string, string>()
  for (const name of BRANDS) {
    const slug = slugifyBrand(name)
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    })
    brandIds.set(name, brand.id)
  }

  let created = 0
  for (const [index, item] of ITEMS.entries()) {
    const slug = `seed-${String(index + 1).padStart(2, '0')}`
    const svg = garmentSvg({
      category: item.category,
      color: COLOR_HEX[item.color],
      subCategory: item.subCategory,
    })

    let png = await sharp(Buffer.from(svg)).png().toBuffer()
    try {
      png = await sharp(png)
        .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    } catch {
      // 裁剪失败时保留原始画布
    }

    const meta = await sharp(png).metadata()
    const assetId = crypto.randomUUID()
    const storageKey = `catalog/${slug}.png`
    await storage.put(storageKey, png)

    await prisma.mediaAsset.create({
      data: {
        id: assetId,
        ownerId: demoId,
        kind: 'GARMENT_CUTOUT',
        status: 'READY',
        visibility: 'PUBLIC',
        storageKey,
        mimeType: 'image/png',
        bytes: png.byteLength,
        width: meta.width,
        height: meta.height,
        encryption: 'NONE',
        moderationStatus: 'APPROVED',
        metadata: { slug, seed: true },
      },
    })

    await prisma.garment.create({
      data: {
        slug,
        name: item.name,
        category: item.category,
        subCategory: item.subCategory ?? item.category.toLowerCase(),
        gender: item.category === 'DRESS' ? 'WOMEN' : 'UNISEX',
        colors: [item.color],
        primaryColorHex: COLOR_HEX[item.color],
        styles: [item.style],
        seasons: [item.season],
        materials: [item.material],
        brandId: brandIds.get(item.brand) ?? null,
        priceCents: item.price * 100,
        currency: 'CNY',
        purchaseUrl: `https://example.com/ootd/${slug}`,
        imageId: assetId,
        cutoutId: assetId,
        attributes: { seeded: true },
        source: 'PLATFORM',
        status: 'PUBLISHED',
        popularity: 10 + ((index * 7) % 80),
      },
    })

    created += 1
  }

  console.log(`[seed] 完成：单品 ${created} 件`)
}

interface RealisticItem {
  slug: string
  name: string
  gender: 'MEN' | 'WOMEN'
  category: 'TOP' | 'BOTTOM' | 'DRESS' | 'OUTERWEAR'
  subCategory: string
  color: string
  colorHex: string
  styles: string[]
  seasons: string[]
  priceCents: number
  image: string
  cutout: string
  caption: string
}

async function seedRealisticCatalog(prisma: PrismaClient, demoId: string): Promise<void> {
  const dir = path.join(process.cwd(), 'prisma', 'seed-assets', 'realistic')
  let items: RealisticItem[]
  try {
    items = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) as RealisticItem[]
  } catch {
    console.log('[seed] 未找到写实商品 manifest，跳过')
    return
  }

  const existing = await prisma.garment.findMany({
    where: { slug: { startsWith: 'real-' } },
    select: { slug: true },
  })
  const existingSlugs = new Set(existing.map((item) => item.slug))

  let created = 0
  for (const [index, item] of items.entries()) {
    if (existingSlugs.has(item.slug)) continue

    const imageBuffer = await readFile(path.join(process.cwd(), item.image))
    const cutoutBuffer = await readFile(path.join(process.cwd(), item.cutout))
    const imageMeta = await sharp(imageBuffer).metadata()
    const cutoutMeta = await sharp(cutoutBuffer).metadata()

    const imageId = crypto.randomUUID()
    const cutoutId = crypto.randomUUID()
    const imageKey = `catalog-realistic/${item.slug}.jpg`
    const cutoutKey = `catalog-realistic/${item.slug}-cutout.webp`

    await storage.put(imageKey, imageBuffer)
    await prisma.mediaAsset.create({
      data: {
        id: imageId,
        ownerId: demoId,
        kind: 'GARMENT_RAW',
        status: 'READY',
        visibility: 'PUBLIC',
        storageKey: imageKey,
        mimeType: 'image/jpeg',
        bytes: imageBuffer.byteLength,
        width: imageMeta.width,
        height: imageMeta.height,
        encryption: 'NONE',
        moderationStatus: 'APPROVED',
        metadata: { slug: item.slug, realistic: true },
      },
    })

    await storage.put(cutoutKey, cutoutBuffer)
    await prisma.mediaAsset.create({
      data: {
        id: cutoutId,
        ownerId: demoId,
        kind: 'GARMENT_CUTOUT',
        status: 'READY',
        visibility: 'PUBLIC',
        storageKey: cutoutKey,
        mimeType: 'image/webp',
        bytes: cutoutBuffer.byteLength,
        width: cutoutMeta.width,
        height: cutoutMeta.height,
        encryption: 'NONE',
        moderationStatus: 'APPROVED',
        metadata: { slug: item.slug, realistic: true, cutout: true },
      },
    })

    await prisma.garment.create({
      data: {
        slug: item.slug,
        name: item.name,
        category: item.category as never,
        subCategory: item.subCategory,
        gender: item.gender as never,
        colors: [item.color] as never,
        primaryColorHex: item.colorHex,
        styles: item.styles as never,
        seasons: item.seasons as never,
        materials: ['棉'],
        fit: 'regular',
        priceCents: item.priceCents,
        currency: 'CNY',
        purchaseUrl: `https://example.com/ootd/${item.slug}`,
        imageId,
        cutoutId,
        attributes: { seeded: true, realistic: true, caption: item.caption },
        source: 'PLATFORM',
        status: 'PUBLISHED',
        popularity: 40 + ((index * 11) % 55),
      },
    })
    created += 1
  }

  // 旧 SVG 商品保留数据，但不再出现在衣橱/推荐中
  await prisma.garment.updateMany({
    where: {
      source: 'PLATFORM',
      status: 'PUBLISHED',
      NOT: { slug: { startsWith: 'real-' } },
    },
    data: { status: 'ARCHIVED' },
  })

  console.log(`[seed] 写实商品 ${created} 件（共 ${items.length} 件，旧 SVG 已归档）`)
}

function communityArt(a: string, b: string, c: string) {  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>
    <rect width="900" height="700" fill="url(#g)"/>
    <circle cx="640" cy="210" r="150" fill="${c}" opacity="0.5"/>
    <path d="M300 180 L420 140 L540 180 L600 420 Q450 470 300 420 Z" fill="#f7f3ec" opacity="0.92"/>
    <path d="M300 440 L600 440 L580 640 L320 640 Z" fill="#2f3b4c" opacity="0.85"/>
  </svg>`
}

async function seedCommunity(prisma: PrismaClient, demoId: string): Promise<void> {
  const existing = await prisma.post.count()
  if (existing > 0) return

  const tagCache = new Map<string, string>()
  const resolveTag = async (name: string) => {
    const cached = tagCache.get(name)
    if (cached) return cached
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `tag-${crypto.createHash('sha1').update(name).digest('hex').slice(0, 8)}`
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { usageCount: { increment: 1 } },
      create: { name, slug, kind: 'GENERAL', usageCount: 1 },
    })
    tagCache.set(name, tag.id)
    return tag.id
  }

  const posts: Array<{
    title: string
    body: string
    tags: string[]
    art: [string, string, string]
  }> = [
    {
      title: '海边约会这套真的绝',
      body: '白色亚麻长裙 + 草编包 + 细带凉鞋。海边风大，长裙选垂坠感好的，拍照也不会贴在腿上。',
      tags: ['海边', '约会', '法式'],
      art: ['#e8d7c3', '#c9a47e', '#b4552d'],
    },
    {
      title: '小个子通勤：高腰直筒裤真的显高',
      body: '上衣塞进去，裤长盖住鞋面一半，外面加短款外套。身高 158 也能穿出 165 的比例。',
      tags: ['通勤', '小个子'],
      art: ['#dfe6ea', '#9fb3c2', '#2f3b4c'],
    },
    {
      title: '面试穿搭复盘：别急着买全套西装',
      body: '互联网公司面试，衬衫裙比西装更松弛。鞋跟 3cm 左右，走路声音不抢戏，坐一整天也舒服。',
      tags: ['面试', '通勤'],
      art: ['#f1e3d3', '#d9b8a6', '#7a5638'],
    },
    {
      title: '秋冬叠穿公式，三件就够了',
      body: '打底 + 针织 + 短外套，颜色控制在两个色系。外套不过胯，比例就不会被压。',
      tags: ['秋冬', '叠穿'],
      art: ['#ece5d8', '#cbbba3', '#5b7a52'],
    },
  ]

  for (const [index, item] of posts.entries()) {
    const jpeg = await sharp(Buffer.from(communityArt(...item.art))).jpeg({ quality: 88 }).toBuffer()
    const assetId = crypto.randomUUID()
    const storageKey = `community/seed-${index + 1}.jpg`
    await storage.put(storageKey, jpeg)

    await prisma.mediaAsset.create({
      data: {
        id: assetId,
        ownerId: demoId,
        kind: 'POST_IMAGE',
        status: 'READY',
        visibility: 'PUBLIC',
        storageKey,
        mimeType: 'image/jpeg',
        bytes: jpeg.byteLength,
        width: 900,
        height: 700,
        encryption: 'NONE',
        moderationStatus: 'APPROVED',
        metadata: { seed: true },
      },
    })

    const tagIds: string[] = []
    for (const name of item.tags) tagIds.push(await resolveTag(name))

    const likeCount = index < 2 ? 1 : 0
    const commentCount = index === 0 ? 2 : index === 1 ? 1 : 0

    const post = await prisma.post.create({
      data: {
        authorId: demoId,
        title: item.title,
        body: item.body,
        coverImageId: assetId,
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        publishedAt: new Date(Date.now() - (index + 1) * 3_600_000),
        images: { create: [{ mediaId: assetId, position: 0 }] },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        likeCount,
        commentCount,
        hotScore: Number(
          ((likeCount * 3 + commentCount * 5) / Math.pow(3, 1.5)).toFixed(3),
        ),
      },
    })

    if (index < 2) {
      await prisma.postLike.create({ data: { postId: post.id, userId: demoId } })
    }
    if (index === 0) {
      await prisma.comment.create({
        data: { postId: post.id, authorId: demoId, body: '这套包换成藤编的更度假！' },
      })
      await prisma.comment.create({
        data: { postId: post.id, authorId: demoId, body: '长裙链接求一个～' },
      })
    }
  }

  console.log(`[seed] 讨论区示例 ${posts.length} 篇`)
}
