import { spawn } from 'node:child_process'
import path from 'node:path'
import { createRequire } from 'node:module'
import { acquirePgliteLock, releasePgliteLock } from '../src/server/pglite-lock'

const mode = process.argv[2] === 'start' ? 'start' : 'dev'
const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')

const dataDir = path.resolve(process.cwd(), process.env.OOTD_DATA_DIR ?? '.data')
const useLock = process.env.DB_DRIVER !== 'postgres'

if (useLock) {
  acquirePgliteLock(dataDir)
  console.log(`[dev] PGlite lock acquired by pid ${process.pid}`)
}

const child = spawn(process.execPath, [nextBin, mode], {
  stdio: 'inherit',
  env: process.env,
})

function shutdown(signal: NodeJS.Signals) {
  try {
    child.kill(signal)
  } catch {
    // 子进程可能已退出
  }
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

child.once('exit', (code, signal) => {
  if (useLock) releasePgliteLock(dataDir)
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})

child.once('error', (error) => {
  console.error('[dev] 启动 Next 失败', error)
  if (useLock) releasePgliteLock(dataDir)
  process.exit(1)
})
