import { withApi, ok } from '@/server/http'
import { requireUser } from '@/server/auth'
import { listClothing } from '@/server/services/clothing.service'
import {
  CATEGORY_VALUES,
  COLOR_VALUES,
  SEASON_VALUES,
  STYLE_VALUES,
} from '@/server/validation'
import type {
  ClothingCategory,
  ClothingColor,
  ClothingSeason,
  ClothingStyle,
} from '@/types/studio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function pick<T extends string>(values: readonly T[], value: string | null): T | undefined {
  if (!value) return undefined
  return (values as readonly string[]).includes(value) ? (value as T) : undefined
}

export async function GET(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)

    const data = await listClothing(user.id, {
      category: pick<ClothingCategory>(CATEGORY_VALUES, searchParams.get('category')),
      color: pick<ClothingColor>(COLOR_VALUES, searchParams.get('color')),
      style: pick<ClothingStyle>(STYLE_VALUES, searchParams.get('style')),
      season: pick<ClothingSeason>(SEASON_VALUES, searchParams.get('season')),
      source: searchParams.get('source') === 'user' ? 'user' : 'platform',
      q: searchParams.get('q') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 100),
    })

    return ok(data)
  })
}
