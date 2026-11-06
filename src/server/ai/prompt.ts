import type { StylistContext } from '@/server/ai/types'
import { CATEGORY_LABEL, COLOR_LABEL, SEASON_LABEL, STYLE_LABEL } from '@/lib/taxonomy'

export const STYLIST_SYSTEM_PROMPT = `你是 OOTD Lab 的资深造型师，擅长把「场景 + 身材 + 预算」翻译成可执行的穿搭方案。
你会收到：场景解析结果、用户画像、候选单品清单（来自站内数据库）。

硬性规则：
1. 只能从候选清单中选择 clothingId；候选不足时才可给 isAiSuggested=true 的补充建议，且不得编造品牌、价格、购买链接。
2. 一套方案必须覆盖：一条连衣裙，或上装 + 下装；必须包含鞋。外套根据季节与正式度决定，包/配饰可选。
3. 禁忌颜色不得出现；预算是软约束，超支必须在 reason 中说明理由（例如"外套可省略，用现有风衣替代"）。
4. reason 必须自然、具体：引用材质、版型、颜色、天气、场合、身材比例中的至少两个要素；禁止"很好看""很百搭""提升气质"这类空话。
5. 只输出 JSON，不要 markdown 代码块，不要解释，不要新增字段。`

export function buildUserPrompt(context: StylistContext): string {
  const { scene, parsed, profile, candidates } = context
  const shortlist = candidates.slice(0, 12)

  const candidateLines = shortlist
    .map(
      (item) =>
        `- id=${item.id} | ${item.name} | ${CATEGORY_LABEL[item.category]} | ${COLOR_LABEL[item.color]} | ${
          item.material ?? '未知材质'
        } | ${item.styles.map((style) => STYLE_LABEL[style]).join('/')} | ${
          item.seasons.map((season) => SEASON_LABEL[season]).join('/')
        } | ¥${item.price ?? '未知'} | ${item.brand ?? '无品牌'}`,
    )
    .join('\n')

  return `【场景】
${scene}

【场景解析】
场合=${parsed.occasion}；正式度=${parsed.formality}/5；季节=${SEASON_LABEL[parsed.season]}；天气=${
    parsed.weather.condition ?? '未知'
  }/${parsed.weather.tempC ?? '未知'}℃；风险=${parsed.riskFlags.join('、') || '无'}

【用户画像】
性别=${profile.gender}；身高=${profile.heightCm ?? '未知'}cm；体重=${
    profile.weightKg ?? '未知'
  }kg；风格偏好=${profile.styles.map((style) => STYLE_LABEL[style]).join('、') || '未指定'}；预算=${
    profile.budget ? `¥${profile.budget}` : '未设置'
  }；禁忌色=${profile.avoidColors.map((color) => COLOR_LABEL[color]).join('、') || '无'}；城市=${
    profile.city ?? '未知'
  }

【候选单品】（只能从中选择，最多 12 件展示）
${candidateLines || '（无候选）'}

【输出 JSON Schema】
{
  "scene": "string",
  "styleSummary": "8-20 字风格标题",
  "reason": "60-200 字，具体到材质/版型/天气/场合/比例",
  "items": [
    {
      "clothingId": "候选 id 或 null",
      "name": "string",
      "category": "TOP|BOTTOM|DRESS|OUTERWEAR|SHOES|BAG|ACCESSORY",
      "color": "string",
      "material": "string",
      "style": "string",
      "price": 0,
      "purchaseUrl": "string",
      "reason": "20-60 字，说明为什么适合这个场景",
      "isAiSuggested": false
    }
  ],
  "imagePrompt": "英文，用于图像模型：场景 + 单品 + 光线 + 构图 + 3:4",
  "tips": ["最多 4 条"],
  "avoidTips": ["最多 3 条"]
}

要求：2-6 件单品；先判断连衣裙或上下装，再补鞋与配饰；总价尽量贴近预算。`
}

export function buildRepairPrompt(errors: string): string {
  return `上一次输出未通过 JSON Schema 校验，错误如下：
${errors}

请严格按 Schema 重新输出完整 JSON：不要新增字段，不要 markdown，items 必须 2-6 件。`
}
