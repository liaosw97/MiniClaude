/**
 * Trace 存储层
 * 负责 JSONL 文件读写和会话索引管理
 */

import { join, sep } from 'path'
import { homedir } from 'os'
import { mkdir, appendFile, readFile, writeFile } from 'fs/promises'
import { TRACES_DIR, INDEX_FILE, type TraceRecord, type TraceIndex, type SessionMetadata } from './types.js'
import { traceLogger } from './traceLogger.js'
import { withLock, createIndexCache, flushCache, incrementWriteCount } from './index-lock.js'

// 内存缓存实例（全局共享，用于 index.json 的高频读写）
const indexCache = createIndexCache()

/**
 * 获取 traces 目录路径
 * @param configDir 配置目录路径（默认 ~/.claude）
 */
export function getTracesDir(configDir?: string): string {
  const base = configDir || process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
  return join(base, TRACES_DIR)
}

/**
 * 获取 trace 文件路径
 * @param sessionId 会话 ID
 * @param date 日期（YYYY-MM-DD 格式，默认今天）
 * @param configDir 配置目录路径
 */
export function getTraceFilePath(sessionId: string, date?: string, configDir?: string): string {
  const tracesDir = getTracesDir(configDir)
  const dateStr = date || new Date().toISOString().split('T')[0]
  return join(tracesDir, dateStr, `${sessionId}.jsonl`)
}

/**
 * 获取 index.json 路径
 * @param configDir 配置目录路径
 */
export function getIndexPath(configDir?: string): string {
  return join(getTracesDir(configDir), INDEX_FILE)
}

/**
 * 读取 index.json
 * @param configDir 配置目录路径
 * @returns 索引对象
 */
export async function readIndex(configDir?: string): Promise<TraceIndex> {
  const cacheKey = configDir || 'default'
  const cached = indexCache.get(cacheKey)
  if (cached) return cached as TraceIndex

  const indexPath = getIndexPath(configDir)
  try {
    const content = await readFile(indexPath, 'utf-8')
    const index = JSON.parse(content)
    indexCache.set(cacheKey, index)
    return index
  } catch (error) {
    const empty: TraceIndex = { sessions: [] }
    indexCache.set(cacheKey, empty)
    return empty
  }
}

/**
 * 扫描所有 JSONL 文件重建 index.json
 * 用于启动时检测不一致或手动修复
 */
export async function reindex(configDir?: string): Promise<{ recovered: number; total: number }> {
  const tracesDir = getTracesDir(configDir)
  const indexPath = getIndexPath(configDir)

  // 读取现有索引（如果存在）
  let existingIndex: TraceIndex
  try {
    const content = await readFile(indexPath, 'utf-8')
    existingIndex = JSON.parse(content)
  } catch {
    existingIndex = { sessions: [] }
  }

  // 扫描 traces 目录下的所有 JSONL 文件
  const sessionMap = new Map<string, SessionMetadata>()

  try {
    const { readdir } = await import('fs/promises')
    const dateDirs = await readdir(tracesDir, { withFileTypes: true })
    for (const dateDir of dateDirs) {
      if (!dateDir.isDirectory()) continue
      const datePath = join(tracesDir, dateDir.name)
      const files = await readdir(datePath)
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue
        const sessionId = file.replace('.jsonl', '')
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            id: sessionId,
            date: dateDir.name,
            model: 'unknown',
            startedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            turns: 0,
            lastTurn: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
          })
        }
      }
    }
  } catch {
    // traces 目录不存在或无法读取
  }

  // 合并现有索引中的元数据（model、turns、tokens）
  for (const existing of existingIndex.sessions) {
    const existing_sessions_1 = sessionMap.get(existing.id)
    if (existing_sessions_1) {
      Object.assign(existing_sessions_1, existing)
    }
  }

  const recoveredSessions = Array.from(sessionMap.values())
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())

  // 只有当有差异时才写回
  const changed = JSON.stringify(recoveredSessions) !== JSON.stringify(existingIndex.sessions)
  if (changed) {
    const newIndex: TraceIndex = { sessions: recoveredSessions }
    await mkdir(getIndexPath(configDir).replace(/index\.json$/, ''), { recursive: true })
    await writeFile(indexPath, JSON.stringify(newIndex, null, 2))
    indexCache.set(configDir || 'default', newIndex)
  }

  return {
    recovered: recoveredSessions.length - existingIndex.sessions.length,
    total: recoveredSessions.length,
  }
}

/**
 * 写入 index.json
 * @param index 索引对象
 * @param configDir 配置目录路径
 */
export async function writeIndex(index: TraceIndex, configDir?: string): Promise<void> {
  const cacheKey = configDir || 'default'
  indexCache.set(cacheKey, index)

  const indexPath = getIndexPath(configDir)
  const dir = indexPath.substring(0, indexPath.lastIndexOf(sep))

  try {
    await mkdir(dir, { recursive: true })
    await writeFile(indexPath, JSON.stringify(index, null, 2))
    incrementWriteCount()
  } catch (error) {
    traceLogger.error('Failed to write index', error)
  }
}

/**
 * 创建会话索引条目
 * @param sessionId 会话 ID
 * @param model 模型名称
 * @param configDir 配置目录路径
 */
export async function createSessionEntry(sessionId: string, model: string, configDir?: string): Promise<void> {
  await withLock(`session:${sessionId}`, async () => {
    const index = await readIndex(configDir)
    const entry: SessionMetadata = {
      id: sessionId,
      date: new Date().toISOString().split('T')[0],
      model,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      turns: 0,
      lastTurn: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0
    }
    index.sessions.unshift(entry)
    await writeIndex(index, configDir)
  })
}

/**
 * 更新会话索引条目
 * @param sessionId 会话 ID
 * @param updates 更新数据
 * @param configDir 配置目录路径
 */
export async function updateSessionEntry(
  sessionId: string,
  updates: Partial<Pick<SessionMetadata, 'turns' | 'lastTurn' | 'totalInputTokens' | 'totalOutputTokens' | 'lastActivity'>>,
  configDir?: string
): Promise<void> {
  await withLock(`session:${sessionId}`, async () => {
    const index = await readIndex(configDir)
    const session = index.sessions.find(s => s.id === sessionId)

    if (session) {
      Object.assign(session, updates, { lastActivity: new Date().toISOString() })
      await writeIndex(index, configDir)
    }
  })
}

/**
 * 获取会话列表（按 lastActivity 降序）
 * @param configDir 配置目录路径
 * @returns 会话列表
 */
export async function listSessions(configDir?: string): Promise<SessionMetadata[]> {
  const index = await readIndex(configDir)
  return index.sessions.sort((a, b) =>
    new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  )
}

/**
 * 获取会话的 trace 记录
 * @param sessionId 会话 ID
 * @param configDir 配置目录路径
 * @returns trace 记录数组
 */
export async function getSessionTrace(sessionId: string, configDir?: string): Promise<TraceRecord[]> {
  const index = await readIndex(configDir)
  const session = index.sessions.find(s => s.id === sessionId)

  if (!session) {
    return []
  }

  const filePath = getTraceFilePath(sessionId, session.date, configDir)
  try {
    const content = await readFile(filePath, 'utf-8')
    return content.trim().split('\n').filter(line => line).map(line => JSON.parse(line))
  } catch (error) {
    return []
  }
}

/**
 * 查询指定 turn 的相邻两条 trace 记录
 * 用于 diff 查看器的数据源
 * turn 不存在时返回 { prev: null, next: null }
 */
export async function getAdjacentRecords(
  sessionId: string,
  turn: number,
  configDir?: string
): Promise<{ prev: TraceRecord | null; next: TraceRecord | null }> {
  if (typeof turn !== 'number' || turn < 1) {
    throw new Error('invalid turn: must be a positive number')
  }
  const records = await getSessionTrace(sessionId, configDir)
  if (records.length === 0) {
    return { prev: null, next: null }
  }

  const sorted = [...records].sort((a, b) => (a.data.turn || 0) - (b.data.turn || 0))
  const idx = sorted.findIndex(r => r.data.turn === turn)

  if (idx === -1) return { prev: null, next: null }

  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  }
}

/**
 * 追加 trace 记录到 JSONL 文件
 * @param sessionId 会话 ID
 * @param record trace 记录
 * @param date 日期（默认今天）
 * @param configDir 配置目录路径
 */
export async function appendTraceRecord(
  sessionId: string,
  record: TraceRecord,
  date?: string,
  configDir?: string
): Promise<void> {
  const filePath = getTraceFilePath(sessionId, date, configDir)
  const dir = filePath.substring(0, filePath.lastIndexOf(sep))

  try {
    await mkdir(dir, { recursive: true })
  } catch (error) {
    traceLogger.error(`Failed to create trace directory ${dir}`, error)
    return
  }

  try {
    await appendFile(filePath, JSON.stringify(record) + '\n')
  } catch (error) {
    traceLogger.error(`Failed to write trace record to ${filePath}`, error)
  }
}
