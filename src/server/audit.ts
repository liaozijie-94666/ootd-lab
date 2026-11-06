import type { Prisma } from '@prisma/client'
import { prisma } from '@/server/db'

export interface AuditInput {
  actorId?: string | null
  action: string
  targetType?: string
  targetId?: string
  ipHash?: string
  userAgent?: string
  meta?: Record<string, unknown>
}

/** 敏感操作审计；失败不影响主流程。 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    console.warn('[audit] 写入失败', input.action, error)
  }
}
