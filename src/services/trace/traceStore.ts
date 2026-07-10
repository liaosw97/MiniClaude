/**
 * Trace 存储层
 * 负责 JSONL 文件读写和会话索引管理
 */

import { join, sep } from 'path'
import { homedir } from 'os'
import { mkdir, appendFile, readFile, writeFile } from 'fs/promises'
import { TRACES_DIR, INDEX_FILE, type TraceRecord, type TraceIndex, type SessionMetadata } from './types.js'
import { traceLogger } from './traceLogger.js'

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
  const indexPath = getIndexPath(configDir)
  try {
    const content = await readFile(indexPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    return { sessions: [] }
  }
}

/**
 * 写入 index.json
 * @param index 索引对象
 * @param configDir 配置目录路径
 */
export async function writeIndex(index: TraceIndex, configDir?: string): Promise<void> {
  const indexPath = getIndexPath(configDir)
  const dir = indexPath.substring(0, indexPath.lastIndexOf(sep))

  try {
    await mkdir(dir, { recursive: true })
    await writeFile(indexPath, JSON.stringify(index, null, 2))
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
  const index = await readIndex(configDir)
  const entry: SessionMetadata = {
    id: sessionId,
    date: new Date().toISOString().split('T')[0],
    model,
    startedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    turns: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0
  }
  index.sessions.unshift(entry)
  await writeIndex(index, configDir)
}

/**
 * 更新会话索引条目
 * @param sessionId 会话 ID
 * @param updates 更新数据
 * @param configDir 配置目录路径
 */
export async function updateSessionEntry(
  sessionId: string,
  updates: Partial<Pick<SessionMetadata, 'turns' | 'totalInputTokens' | 'totalOutputTokens' | 'lastActivity'>>,
  configDir?: string
): Promise<void> {
  const index = await readIndex(configDir)
  const session = index.sessions.find(s => s.id === sessionId)

  if (session) {
    Object.assign(session, updates, { lastActivity: new Date().toISOString() })
    await writeIndex(index, configDir)
  }
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
