/**
 * 进程内异步队列（inline driver）。
 * 生产替换为 BullMQ：接口保持一致（enqueue(job)），见 docs/02-architecture.md。
 */
export type Job<T = void> = () => Promise<T>

export function enqueue(job: Job, delayMs = 250): void {
  const timer = setTimeout(() => {
    job().catch((error) => {
      console.error('[queue] inline job failed:', error)
    })
  }, delayMs)

  // 允许 Node 进程在任务完成后自然退出（不影响测试与脚本）
  if (typeof timer.unref === 'function') timer.unref()
}
