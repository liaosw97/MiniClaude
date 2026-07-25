// src/services/trace/index-lock.ts
import { getFileSystem } from './runtime/fs.js'
import { getIndexPath } from './traceStore.js'

// 内存锁 Map
const locks = new Map<string, Promise<void>>()

/**
 * 基于内存 Map 的异步锁，确保同一时间只有一个写入者
 */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  while (locks.has(key)) {
    await locks.get(key)!.catch(() => {})
  }

  let resolveLock: () => void
  const lockPromise = new Promise<void>(resolve => { resolveLock = resolve })
  locks.set(key, lockPromise)

  try {
    return await fn()
  } finally {
    locks.delete(key)
    resolveLock!()
  }
}

// 内存缓存
interface CacheEntry {
  data: unknown
  dirty: boolean
}

const cache = new Map<string, CacheEntry>()

export function createIndexCache() {
  return {
    get(key: string): unknown {
      return cache.get(key)?.data
    },
    set(key: string, data: unknown): void {
      cache.set(key, { data, dirty: true })
    },
    has(key: string): boolean {
      return cache.has(key)
    },
    isDirty(key: string): boolean {
      return cache.get(key)?.dirty ?? false
    },
    markClean(key: string): void {
      const entry = cache.get(key)
      if (entry) entry.dirty = false
    }
  }
}

let flushTimer: ReturnType<typeof setInterval> | null = null
let writeCount = 0
const FLUSH_INTERVAL = 5000
const FLUSH_WRITE_THRESHOLD = 10

/**
 * 递增写入计数，达到阈值时触发刷盘
 */
export function incrementWriteCount(): void {
  writeCount++
  if (writeCount >= FLUSH_WRITE_THRESHOLD) {
    writeCount = 0
    flushCache().catch(() => {})
  }
}

/**
 * 启动定期持久化
 */
export function startPeriodicFlush(intervalMs: number = FLUSH_INTERVAL): void {
  if (flushTimer) return
  flushTimer = setInterval(async () => {
    await flushCache()
  }, intervalMs)
}

/**
 * 停止定期持久化
 */
export function stopPeriodicFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}

/**
 * 将脏缓存写入磁盘
 * 遍历所有缓存条目，按 key 确定各自路径写入
 */
export async function flushCache(): Promise<void> {
  const fs = getFileSystem()

  for (const [key, entry] of cache.entries()) {
    if (!entry.dirty) continue

    const configDir = key === 'default' ? undefined : key
    const indexPath = getIndexPath(configDir)
    const dir = indexPath.includes('\\') ? indexPath.substring(0, indexPath.lastIndexOf('\\')) : indexPath

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(indexPath, JSON.stringify(entry.data, null, 2))
        entry.dirty = false
        writeCount = 0
        break
      } catch (error) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 100))
        } else {
          console.error(`[trace] Failed to flush index after 3 retries: ${error}`)
        }
      }
    }
  }
}

let exitHandlerRegistered = false

/**
 * 注册退出处理（SIGINT/SIGTERM）
 */
export function registerExitHandler(): void {
  if (exitHandlerRegistered) return
  exitHandlerRegistered = true
  const handler = async () => {
    await flushCache()
    stopPeriodicFlush()
  }
  process.on('SIGINT', handler)
  process.on('SIGTERM', handler)
}