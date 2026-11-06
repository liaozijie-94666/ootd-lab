import fs from 'node:fs'
import path from 'node:path'

const LOCK_NAME = '.pglite.lock'

function lockPath(dataDir: string): string {
  return path.join(dataDir, LOCK_NAME)
}

function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM 表示进程存在但无权限；ESRCH 才是不存在
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function sleep(ms: number) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    // 仅在启动阶段使用，阻塞几十毫秒可接受
  }
}

/**
 * PGlite 是单进程数据库：同一 dataDir 只能有一个进程打开。
 * 用 pid 锁提前给出可读错误，避免 WASM 层面的 "Aborted()"。
 */
export function acquirePgliteLock(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true })
  const file = lockPath(dataDir)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(file, 'wx')
      fs.writeFileSync(fd, String(process.pid))
      fs.closeSync(fd)
      process.once('exit', () => releasePgliteLock(dataDir))
      return
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error

      const raw = fs.readFileSync(file, 'utf8').trim()
      const pid = Number(raw)
      if (pid === process.pid) return

      if (pidAlive(pid)) {
        throw new Error(
          `[db] PGlite 数据目录正在被进程 ${pid} 使用。请先停止 pnpm dev / 另一个实例，再启动。`,
        )
      }

      // 上次异常退出留下的锁，清理后重试
      try {
        fs.unlinkSync(file)
      } catch {
        // 并发清理时忽略
      }
      sleep(30)
    }
  }

  throw new Error('[db] 无法获取 PGlite 锁，请检查 .data 目录权限')
}

export function releasePgliteLock(dataDir: string): void {
  const file = lockPath(dataDir)
  try {
    const raw = fs.readFileSync(file, 'utf8').trim()
    if (Number(raw) === process.pid) fs.unlinkSync(file)
  } catch {
    // 已删除或不可读
  }
}
