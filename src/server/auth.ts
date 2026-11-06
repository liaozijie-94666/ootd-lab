import { auth } from '@/server/auth-config'
import { prisma } from '@/server/db'
import { ApiError } from '@/server/http'
import type { User } from '@prisma/client'

/**
 * 返回当前会话用户；未登录返回 null（社区公开页/可选个性化使用）。
 * 所有需要写入或访问私有资源的接口必须用 requireUser()。
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.status !== 'ACTIVE') return null
  return user
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new ApiError('UNAUTHENTICATED', '请先登录', 401)
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') throw new ApiError('FORBIDDEN', '需要管理员权限', 403)
  return user
}
