import path from 'node:path'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { serverEnv } from '@/server/env'

const ROOT = path.join(serverEnv.dataDir, 'uploads')

type StorageDriver = 'local' | 'supabase'

function driver(): StorageDriver {
  return process.env.STORAGE_DRIVER === 'supabase' ? 'supabase' : 'local'
}

function bucketName(): string {
  return process.env.SUPABASE_BUCKET?.trim() || 'ootd-media'
}

let supabaseClient: SupabaseClient | null = null

function supabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient

  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new Error('[storage] STORAGE_DRIVER=supabase 需要 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY')
  }

  supabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return supabaseClient
}

function safeKey(key: string) {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.includes('..')) throw new Error('非法存储路径')
  return normalized
}

function absolutePath(key: string) {
  return path.join(ROOT, safeKey(key))
}

function contentTypeFor(key: string): string {
  if (key.endsWith('.png')) return 'image/png'
  if (key.endsWith('.webp')) return 'image/webp'
  if (key.endsWith('.gif')) return 'image/gif'
  if (key.endsWith('.enc')) return 'application/octet-stream'
  if (key.endsWith('.json')) return 'application/json'
  return 'image/jpeg'
}

export const storage = {
  driver,

  async put(key: string, data: Buffer): Promise<void> {
    const safe = safeKey(key)
    if (driver() === 'supabase') {
      const { error } = await supabase()
        .storage.from(bucketName())
        .upload(safe, data, { contentType: contentTypeFor(safe), upsert: true })
      if (error) throw new Error(`[storage] Supabase 上传失败：${error.message}`)
      return
    }

    const target = absolutePath(safe)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, data)
  },

  async get(key: string): Promise<Buffer> {
    const safe = safeKey(key)
    if (driver() === 'supabase') {
      const { data, error } = await supabase().storage.from(bucketName()).download(safe)
      if (error || !data) {
        throw new Error(`[storage] Supabase 下载失败：${error?.message ?? 'empty'}`)
      }
      return Buffer.from(await data.arrayBuffer())
    }

    return readFile(absolutePath(safe))
  },

  async remove(key: string): Promise<void> {
    const safe = safeKey(key)
    if (driver() === 'supabase') {
      const { error } = await supabase().storage.from(bucketName()).remove([safe])
      if (error) throw new Error(`[storage] Supabase 删除失败：${error.message}`)
      return
    }

    await rm(absolutePath(safe), { force: true })
  },

  publicPath(key: string): string {
    if (key.startsWith('catalog/')) return `/seed/${key.slice('catalog/'.length)}`
    return `/api/media/${key}`
  },
}
