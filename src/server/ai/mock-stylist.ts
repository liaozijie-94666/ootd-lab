import type {
  CandidateItem,
  RecommendedItem,
  StylistContext,
  StylistDraft,
  StylistProvider,
} from '@/server/ai/types'
import { CATEGORY_LABEL, COLOR_LABEL } from '@/lib/taxonomy'
import { COLOR_HEX } from '@/lib/taxonomy'
import type { ClothingCategory, ClothingColor, ClothingStyle } from '@/types/studio'

const OCCASION_OPENING: Record<string, string> = {
  DATE: '约会不适合用力过猛',
  INTERVIEW: '面试的重点是让人记住你而不是衣服',
  WEDDING: '婚礼要得体但不能抢新娘风头',
  COMMUTE: '通勤需要一套能从早会穿到下班的设计',
  PARTY: '派对需要一点记忆点，但别全身都是重点',
  TRAVEL: '旅行穿搭要经得起走路和拍照',
  SPORT: '运动场景优先活动量和透气',
  DAILY: '日常搭配要舒服，也要有精神',
}

const OCCASION_STYLE: Record<string, ClothingStyle[]> = {
  DATE: ['ROMANTIC', 'FRENCH', 'KOREAN'],
  INTERVIEW: ['BUSINESS', 'SMART_CASUAL', 'MINIMAL'],
  WEDDING: ['ROMANTIC', 'FRENCH', 'PREPPY'],
  COMMUTE: ['SMART_CASUAL', 'MINIMAL', 'BUSINESS'],
  PARTY: ['Y2K', 'STREET', 'ROMANTIC'],
  TRAVEL: ['CASUAL', 'OUTDOOR', 'STREET'],
  SPORT: ['SPORTY', 'OUTDOOR'],
  DAILY: ['CASUAL', 'MINIMAL', 'KOREAN'],
}

const CATEGORY_EN: Record<ClothingCategory, string> = {
  TOP: 'top',
  BOTTOM: 'trousers',
  DRESS: 'midi dress',
  OUTERWEAR: 'light coat',
  SHOES: 'shoes',
  BAG: 'small handbag',
  ACCESSORY: 'minimal jewelry',
}

const COLOR_EN: Record<ClothingColor, string> = {
  BLACK: 'black',
  WHITE: 'white',
  GRAY: 'grey',
  BEIGE: 'beige',
  BROWN: 'brown',
  RED: 'red',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN: 'green',
  BLUE: 'blue',
  NAVY: 'navy',
  PURPLE: 'purple',
  PINK: 'pink',
  GOLD: 'gold',
  SILVER: 'silver',
  MULTI: 'multicolor',
}

const OCCASION_EN: Record<string, string> = {
  DATE: 'romantic date',
  INTERVIEW: 'city job interview',
  WEDDING: 'garden wedding guest',
  COMMUTE: 'office commute',
  PARTY: 'evening party',
  TRAVEL: 'weekend travel',
  SPORT: 'outdoor sport',
  DAILY: 'everyday city',
}

function materialTrait(material: string): string {
  if (/亚麻|linen/i.test(material)) return '亚麻透气快干，出汗也不贴身'
  if (/真丝|silk|缎/i.test(material)) return '真丝垂坠，走动时有柔和光泽'
  if (/羊毛|wool/i.test(material)) return '羊毛保暖但不显厚'
  if (/棉|棉质|cotton/i.test(material)) return '棉质亲肤，日常好打理'
  if (/皮革|leather/i.test(material)) return '皮革挺括，能压住整体'
  if (/牛仔|denim/i.test(material)) return '牛仔耐造，和休闲场景很合'
  if (/雪纺|chiffon/i.test(material)) return '雪纺轻盈，拍照有流动感'
  if (/针织|knit/i.test(material)) return '针织柔软，能弱化正式感'
  return '面料有质感，不容易显廉价'
}

function colorTrait(color: ClothingColor): string {
  const map: Record<string, string> = {
    WHITE: '白色在强光下干净，也衬肤色',
    BLACK: '黑色收敛，正式场合不出错',
    BEIGE: '米色和肤色接近，视觉上更显高',
    BLUE: '蓝色清爽，适合白天',
    NAVY: '藏青比黑色柔和，面试更松弛',
    RED: '红色是视觉中心，其他单品要收敛',
    GREEN: '绿色有户外感，和工装很搭',
    BROWN: '棕色系耐看，适合秋冬',
    GRAY: '灰色中性，怎么搭都不突兀',
    PINK: '粉色降低攻击性，约会更自然',
    GOLD: '金属色只做点缀，不要超过两处',
    SILVER: '银色偏冷，适合夜间或派对',
    YELLOW: '黄色提气色，但面积别太大',
    PURPLE: '紫色挑肤色，靠近脸部要谨慎',
    ORANGE: '橙色抢眼，适合小面积配饰',
    MULTI: '多色单品本身信息量大，其他部分保持素色',
  }
  return map[color] ?? '颜色中和，容易和其他单品配合'
}

function categoryTrait(item: CandidateItem, context: StylistContext): string {
  const { parsed } = context
  switch (item.category) {
    case 'DRESS':
      return parsed.riskFlags.includes('wind')
        ? '收腰 + 及踝长度，风大时不容易走光'
        : '收腰位置偏高，把比例重心提上去'
    case 'TOP':
      return '肩线合身、衣长不过胯，塞进下装能显腿长'
    case 'BOTTOM':
      return '高腰直筒版型，遮住胯宽又不会拖地'
    case 'OUTERWEAR':
      return '短款不过胯，叠穿也不压身高'
    case 'SHOES':
      return '露脚背的鞋型，视觉上把腿延长一截'
    case 'BAG':
      return '尺寸不超过 A4，重心不会往下坠'
    case 'ACCESSORY':
      return '只留一处金属反光，脸部更干净'
    default:
      return '版型利落，和整体线条一致'
  }
}

function itemReason(item: CandidateItem, context: StylistContext): string {
  const parts = [materialTrait(item.material ?? ''), categoryTrait(item, context)]
  if (context.parsed.riskFlags.includes('sun') && item.category === 'ACCESSORY') {
    parts.unshift('海边紫外线强，墨镜是实用配件')
  }
  if (context.parsed.occasion === 'INTERVIEW' && item.category === 'SHOES') {
    parts.push('鞋跟不超过 5cm，走路声音也不抢戏')
  }
  return `${parts.slice(0, 2).join('，')}。`
}

function colorName(color: ClothingColor): string {
  return color === 'MULTI' ? '印花' : COLOR_LABEL[color]
}

function pick(list: CandidateItem[] | undefined): CandidateItem | null {
  return list?.[0] ?? null
}

function styleSummaryOf(items: CandidateItem[], context: StylistContext): string {
  const hero = items[0]
  const sceneWord =
    context.parsed.occasion === 'DATE'
      ? '海风'
      : context.parsed.occasion === 'INTERVIEW'
        ? '利落'
        : context.parsed.occasion === 'WEDDING'
          ? '柔光'
          : context.parsed.occasion === 'COMMUTE'
            ? '松弛'
            : context.parsed.occasion === 'PARTY'
              ? '夜色'
              : context.parsed.occasion === 'TRAVEL'
                ? '轻装'
                : context.parsed.occasion === 'SPORT'
                  ? '轻快'
                  : '日常'
  const heroWord =
    hero?.category === 'DRESS'
      ? `${colorName(hero.color)}长裙`
      : hero
        ? `${colorName(hero.color)}${CATEGORY_LABEL[hero.category]}`
        : '基础款'
  return `${sceneWord} · ${heroWord}`
}

function trimToBudget(chosen: CandidateItem[], budget: number | undefined): CandidateItem[] {
  if (!budget) return chosen
  const total = () => chosen.reduce((sum, item) => sum + (item.price ?? 0), 0)
  const removable: ClothingCategory[] = ['ACCESSORY', 'BAG', 'OUTERWEAR']

  for (const category of removable) {
    if (total() <= budget * 1.05) break
    const index = chosen.findIndex((item) => item.category === category)
    if (index >= 0) chosen.splice(index, 1)
  }

  return chosen
}

function buildReason(items: RecommendedItem[], context: StylistContext): string {
  const { parsed, profile } = context
  const open = OCCASION_OPENING[parsed.occasion] ?? OCCASION_OPENING.DAILY
  const weather: string[] = []
  if (parsed.weather.tempC != null) {
    weather.push(`当地约 ${parsed.weather.tempC}℃`)
  }
  if (parsed.riskFlags.includes('wind')) weather.push('海边风大')
  if (parsed.riskFlags.includes('sun')) weather.push('日晒强')
  if (parsed.weather.condition === 'RAIN') weather.push('可能下雨')

  const weatherSentence = weather.length ? `${weather.join('、')}，` : ''

  const dbItems = items.filter((item) => !item.isAiSuggested)
  const hero = dbItems[0]
  const silhouette = hero
    ? hero.category === 'DRESS'
      ? `用一条${colorName(hero.color)}${hero.material ?? ''}连衣裙把腰线收住，比上下装更省心，也更适合${
          parsed.occasion === 'WEDDING' ? '婚礼' : '约会'
        }。`
      : `上装用${hero.name}压住正式度，下装选高腰直筒把比例拉长。`
    : '站内暂时没有完全匹配的单品，先用 AI 建议补齐轮廓。'

  const total = dbItems.reduce((sum, item) => sum + (item.price ?? 0), 0)
  const aiCount = items.filter((item) => item.isAiSuggested).length
  const totalLabel = aiCount > 0 ? '站内单品合计' : '整套参考价'
  const aiNote = aiCount > 0 ? '（AI 建议项未计价）' : ''
  const budgetSentence =
    profile.budget != null
      ? total <= profile.budget
        ? `${totalLabel} ¥${total}${aiNote}，在 ¥${profile.budget} 预算内还有余量。`
        : `${totalLabel} ¥${total}${aiNote}，比 ¥${profile.budget} 预算高 ¥${total - profile.budget}，可以去掉包或外套再压。`
      : ''

  const heightSentence =
    profile.heightCm != null && profile.heightCm < 162
      ? '身高偏娇小，外套和包都控制在短款小体量，避免被压住。'
      : ''

  return `${open}。${weatherSentence}${silhouette}${heightSentence}${budgetSentence}`.slice(0, 300)
}

function buildImagePrompt(items: RecommendedItem[], context: StylistContext): string {
  const pieces = items
    .filter((item) => !item.isAiSuggested)
    .map((item) => `${COLOR_EN[item.color]} ${item.material ?? ''} ${CATEGORY_EN[item.category]}`.trim())
    .join(', ')

  return `editorial fashion lookbook, full body, ${pieces}, ${OCCASION_EN[context.parsed.occasion]}, ${
    context.parsed.weather.condition === 'SUNNY' ? 'soft natural sunlight' : 'soft diffused daylight'
  }, warm neutral background, 35mm, 3:4`.slice(0, 400)
}

export class MockStylistProvider implements StylistProvider {
  readonly id = 'mock'
  readonly model = 'rule-stylist-v1'

  isConfigured(): boolean {
    return true
  }

  async generate(context: StylistContext): Promise<StylistDraft> {
    const { byCategory, parsed } = context

    const preferDress = ['DATE', 'WEDDING', 'PARTY'].includes(parsed.occasion)
    const chosen: CandidateItem[] = []

    const dress = preferDress ? pick(byCategory.DRESS) : null
    if (dress) {
      chosen.push(dress)
    } else {
      const top = pick(byCategory.TOP)
      const bottom = pick(byCategory.BOTTOM)
      if (top) chosen.push(top)
      if (bottom) chosen.push(bottom)
    }

    const needsOuterwear =
      parsed.season === 'WINTER' ||
      parsed.season === 'AUTUMN' ||
      parsed.formality >= 4 ||
      parsed.riskFlags.includes('cold')
    if (needsOuterwear) {
      const outer = pick(byCategory.OUTERWEAR)
      if (outer) chosen.push(outer)
    }

    const shoes = pick(byCategory.SHOES)
    if (shoes) chosen.push(shoes)

    if (parsed.occasion !== 'SPORT') {
      const bag = pick(byCategory.BAG)
      if (bag) chosen.push(bag)
    }

    if (parsed.riskFlags.includes('sun') || parsed.formality >= 4) {
      const accessory = pick(byCategory.ACCESSORY)
      if (accessory) chosen.push(accessory)
    }

    trimToBudget(chosen, context.profile.budget)

    const unique = chosen.filter(
      (item, index) => chosen.findIndex((other) => other.id === item.id) === index,
    )

    const items: RecommendedItem[] = unique.map((item) => ({
      clothingId: item.id,
      name: item.name,
      category: item.category,
      color: item.color,
      colorHex: COLOR_HEX[item.color],
      material: item.material,
      style: item.styles[0] ?? 'CASUAL',
      imageUrl: item.imageUrl,
      price: item.price,
      purchaseUrl: item.purchaseUrl,
      brand: item.brand,
      reason: itemReason(item, context),
      isAiSuggested: false,
    }))

    if (items.length < 2) {
      const fallbackCategory: ClothingCategory = items.some((item) => item.category === 'TOP')
        ? 'BOTTOM'
        : 'TOP'
      items.push({
        clothingId: null,
        name:
          fallbackCategory === 'BOTTOM' ? '高腰直筒下装（AI 建议）' : '基础款上衣（AI 建议）',
        category: fallbackCategory,
        color: 'WHITE',
        colorHex: COLOR_HEX.WHITE,
        material: null,
        style: 'MINIMAL',
        imageUrl: null,
        price: null,
        purchaseUrl: null,
        brand: null,
        reason:
          fallbackCategory === 'BOTTOM'
            ? '站内预算内没有合适的下装，建议用高腰直筒版型把比例拉长，颜色贴近鞋包更统一。'
            : '站内可选单品不足，先用一件肩线合身的白色上衣打底，塞进下装更显比例。',
        isAiSuggested: true,
      })
    }

    const dbNames = unique.slice(0, 3).map((item) => item.name).join('、')

    return {
      scene: context.scene,
      styleSummary: styleSummaryOf(unique, context).slice(0, 40),
      reason: buildReason(items, context),
      items: items.map((item) => ({
        clothingId: item.clothingId,
        name: item.name,
        category: item.category,
        color: item.color,
        material: item.material ?? undefined,
        style: item.style,
        price: item.price ?? undefined,
        purchaseUrl: item.purchaseUrl ?? undefined,
        reason: item.reason,
        isAiSuggested: item.isAiSuggested,
      })),
      imagePrompt: buildImagePrompt(items, context),
      tips: [
        dbNames ? `把${unique[0] ? CATEGORY_LABEL[unique[0].category] : '上衣'}下摆塞好，腰线位置决定比例。` : '先确定腰线，再补配饰。',
        parsed.occasion === 'INTERVIEW' ? '配饰只留一件，手表比手链更稳妥。' : '包和鞋同色系，整体会更完整。',
      ].slice(0, 3),
      avoidTips: [
        parsed.riskFlags.includes('sun') ? '别选大面积黑色，海边吸热也显沉。' : '避免全身超过三种主色。',
        parsed.occasion === 'WEDDING' ? '不要穿纯白礼服，容易抢新娘风头。' : '不要同时叠戴夸张项链和耳饰。',
      ].slice(0, 3),
    }
  }
}
