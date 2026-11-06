export class ApiClientError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.details = details
  }
}

/**
 * 统一 fetch：自动 JSON、错误包络解析、网络错误兜底。
 * 不读取/不携带任何模型密钥（所有 AI 调用都在服务端）。
 */
export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiClientError('网络连接失败，请检查网络后重试', 'NETWORK_ERROR', 0)
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; details?: unknown } }
    | null

  if (!response.ok) {
    throw new ApiClientError(
      payload?.error?.message ?? '请求失败，请稍后重试',
      payload?.error?.code ?? 'UNKNOWN',
      response.status,
      payload?.error?.details,
    )
  }

  return payload as T
}
