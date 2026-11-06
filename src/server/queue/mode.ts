/**
 * Netlify / Serverless 没有常驻进程：响应返回后 setTimeout 可能被冻结。
 * INLINE_TASK_MODE=sync（或 NETLIFY=true）时，业务层在请求内 await 执行任务。
 */
export function isSyncTaskMode(): boolean {
  return (
    process.env.INLINE_TASK_MODE === 'sync' ||
    process.env.NETLIFY === 'true' ||
    process.env.WAIT_FOR_GENERATION === 'true'
  )
}
