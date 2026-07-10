/**
 * 懒加载模块 — 大数据集按需加载
 *
 * 对于大数据集（>50 条记录），仅解析元数据构建 stub 条目，
 * 完整数据在用户选中时才懒加载。
 *
 * 优化内存使用和初始加载时间。
 */

import type { TraceEntry } from '../../shared/types'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** Stub 条目（轻量级元数据） */
export interface StubEntry {
  request_id: string
  turn: string
  timestamp: string
  model: string
  method: string
  path: string
  status: number
  duration_ms: number
  transport: string
  /** 原始 JSONL 行号（用于懒加载定位） */
  lineIndex: number
  /** 原始 JSONL 内容（可选，用于小数据集内联） */
  raw?: string
}

/** 懒加载状态 */
interface LazyState {
  stubs: StubEntry[]
  fullEntries: Map<string, TraceEntry>
  rawLines: string[]
  isLoaded: boolean
}

// ─── 状态管理 ─────────────────────────────────────────────────────────────────

const state: LazyState = {
  stubs: [],
  fullEntries: new Map(),
  rawLines: [],
  isLoaded: false,
}

// ─── Stub 构建 ────────────────────────────────────────────────────────────────

/**
 * 从 JSONL 行构建 stub 条目
 *
 * 仅提取元数据字段，不解析完整的 request/response body。
 * 大幅减少内存占用和解析时间。
 */
export function buildStubEntry(line: string, lineIndex: number): StubEntry | null {
  try {
    const entry = JSON.parse(line)

    // 提取 request 元数据
    const request = entry.request ?? {}
    const response = entry.response ?? {}

    return {
      request_id: entry.request_id ?? `line-${lineIndex}`,
      turn: String(entry.turn ?? ''),
      timestamp: entry.timestamp ?? '',
      model: request.body?.model ?? 'unknown',
      method: request.method ?? 'POST',
      path: request.path ?? '',
      status: response.status ?? 0,
      duration_ms: entry.duration_ms ?? 0,
      transport: entry.transport ?? 'unknown',
      lineIndex,
      raw: line,
    }
  } catch {
    return null
  }
}

/**
 * 从 JSONL 内容构建 stub 列表
 */
export function buildStubList(jsonlContent: string): StubEntry[] {
  const lines = jsonlContent.trim().split('\n')
  state.rawLines = lines
  state.isLoaded = false
  state.fullEntries.clear()

  const stubs: StubEntry[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const stub = buildStubEntry(line, i)
    if (stub) {
      stubs.push(stub)
    }
  }

  state.stubs = stubs
  return stubs
}

/**
 * 从 File 对象构建 stub 列表（异步）
 */
export async function buildStubListFromFile(file: File): Promise<StubEntry[]> {
  const text = await file.text()
  return buildStubList(text)
}

// ─── 完整条目加载 ─────────────────────────────────────────────────────────────

/**
 * 获取完整条目（懒加载）
 *
 * 首次调用时解析原始 JSONL 行，后续调用返回缓存。
 */
export function getFullEntry(requestId: string): TraceEntry | null {
  // 已缓存
  const cached = state.fullEntries.get(requestId)
  if (cached) return cached

  // 查找对应的 stub
  const stub = state.stubs.find(s => s.request_id === requestId)
  if (!stub || !stub.raw) return null

  // 解析完整条目
  try {
    const fullEntry = JSON.parse(stub.raw) as TraceEntry
    state.fullEntries.set(requestId, fullEntry)
    return fullEntry
  } catch {
    return null
  }
}

/**
 * 预加载指定范围的条目
 */
export function preloadEntries(start: number, count: number): void {
  const end = Math.min(start + count, state.stubs.length)
  for (let i = start; i < end; i++) {
    const stub = state.stubs[i]
    if (stub && !state.fullEntries.has(stub.request_id) && stub.raw) {
      try {
        const entry = JSON.parse(stub.raw) as TraceEntry
        state.fullEntries.set(stub.request_id, entry)
      } catch {
        // 忽略解析错误
      }
    }
  }
}

// ─── 状态查询 ─────────────────────────────────────────────────────────────────

/**
 * 获取所有 stub 条目
 */
export function getStubs(): StubEntry[] {
  return state.stubs
}

/**
 * 获取 stub 条目数量
 */
export function getStubCount(): number {
  return state.stubs.length
}

/**
 * 检查是否已加载完整数据
 */
export function isFullyLoaded(): boolean {
  return state.isLoaded
}

/**
 * 获取已缓存的完整条目数量
 */
export function getCachedCount(): number {
  return state.fullEntries.size
}

/**
 * 清空缓存
 */
export function clearCache(): void {
  state.stubs = []
  state.fullEntries.clear()
  state.rawLines = []
  state.isLoaded = false
}

// ─── 批量操作 ─────────────────────────────────────────────────────────────────

/**
 * 加载所有条目（用于小数据集或导出）
 */
export function loadAllEntries(): TraceEntry[] {
  const entries: TraceEntry[] = []
  for (const stub of state.stubs) {
    const entry = getFullEntry(stub.request_id)
    if (entry) {
      entries.push(entry)
    }
  }
  state.isLoaded = true
  return entries
}

/**
 * 获取指定索引范围的完整条目
 */
export function getEntriesRange(start: number, count: number): TraceEntry[] {
  const entries: TraceEntry[] = []
  const end = Math.min(start + count, state.stubs.length)

  for (let i = start; i < end; i++) {
    const stub = state.stubs[i]
    if (stub) {
      const entry = getFullEntry(stub.request_id)
      if (entry) {
        entries.push(entry)
      }
    }
  }

  return entries
}

// ─── 阈值常量 ─────────────────────────────────────────────────────────────────

/** 懒加载阈值：超过此数量时启用懒加载 */
export const LAZY_THRESHOLD = 50

/**
 * 判断是否应启用懒加载
 */
export function shouldUseLazyLoading(entryCount: number): boolean {
  return entryCount > LAZY_THRESHOLD
}
