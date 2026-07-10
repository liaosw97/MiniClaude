/**
 * 侧边栏搜索 — 在侧边栏条目中搜索
 *
 * 支持按 request_id、model、path、timestamp 等字段搜索，
 * 实时过滤侧边栏显示的条目。
 */

import type { TraceEntry } from '../../shared/types'
import { $ } from '../../shared/dom'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 搜索状态 */
interface SearchState {
  query: string
  isActive: boolean
  matchedIds: Set<string>
  currentMatchIndex: number
  matchedIdList: string[]
}

/** 搜索结果高亮信息 */
export interface SearchHighlight {
  requestId: string
  field: string
  matchedText: string
  startIndex: number
  endIndex: number
}

// ─── 状态管理 ─────────────────────────────────────────────────────────────────

const state: SearchState = {
  query: '',
  isActive: false,
  matchedIds: new Set(),
  currentMatchIndex: -1,
  matchedIdList: [],
}

// ─── 搜索匹配 ─────────────────────────────────────────────────────────────────

/**
 * 检查条目是否匹配搜索查询
 *
 * 搜索字段：request_id, model, path, method, timestamp, turn
 */
export function matchSearch(entry: TraceEntry, query: string): boolean {
  if (!query) return true

  const q = query.toLowerCase()
  const searchable = [
    entry.request_id,
    entry.turn,
    entry.timestamp,
    entry.request.method,
    entry.request.path,
    entry.request.body?.model ?? '',
    String(entry.response.status),
  ].join(' ').toLowerCase()

  return searchable.includes(q)
}

/**
 * 批量过滤条目
 */
export function filterEntries(
  entries: TraceEntry[],
  query: string
): TraceEntry[] {
  if (!query) return entries
  return entries.filter(entry => matchSearch(entry, query))
}

/**
 * 获取匹配高亮信息
 */
export function getSearchHighlights(
  entry: TraceEntry,
  query: string
): SearchHighlight[] {
  if (!query) return []

  const highlights: SearchHighlight[] = []
  const q = query.toLowerCase()

  const fields: Array<{ name: string; value: string }> = [
    { name: 'request_id', value: entry.request_id },
    { name: 'turn', value: entry.turn },
    { name: 'timestamp', value: entry.timestamp },
    { name: 'method', value: entry.request.method },
    { name: 'path', value: entry.request.path },
    { name: 'model', value: entry.request.body?.model ?? '' },
  ]

  for (const field of fields) {
    const index = field.value.toLowerCase().indexOf(q)
    if (index !== -1) {
      highlights.push({
        requestId: entry.request_id,
        field: field.name,
        matchedText: field.value.substring(index, index + query.length),
        startIndex: index,
        endIndex: index + query.length,
      })
    }
  }

  return highlights
}

// ─── 搜索控制 ─────────────────────────────────────────────────────────────────

/**
 * 执行搜索
 */
export function onSearch(
  entries: TraceEntry[],
  query: string,
  onResults?: (filtered: TraceEntry[]) => void
): TraceEntry[] {
  state.query = query
  state.isActive = query.length > 0
  state.currentMatchIndex = -1

  const filtered = filterEntries(entries, query)

  state.matchedIds = new Set(filtered.map(e => e.request_id))
  state.matchedIdList = filtered.map(e => e.request_id)

  onResults?.(filtered)
  return filtered
}

/**
 * 清除搜索
 */
export function clearSearch(): void {
  state.query = ''
  state.isActive = false
  state.matchedIds.clear()
  state.currentMatchIndex = -1
  state.matchedIdList = []
}

/**
 * 获取当前搜索状态
 */
export function getSearchState(): Readonly<SearchState> {
  return { ...state }
}

/**
 * 检查条目是否匹配当前搜索
 */
export function isMatching(requestId: string): boolean {
  if (!state.isActive) return true
  return state.matchedIds.has(requestId)
}

// ─── 导航 ─────────────────────────────────────────────────────────────────────

/**
 * 跳转到下一个匹配项
 */
export function nextMatch(): string | null {
  if (state.matchedIdList.length === 0) return null

  state.currentMatchIndex = (state.currentMatchIndex + 1) % state.matchedIdList.length
  return state.matchedIdList[state.currentMatchIndex]
}

/**
 * 跳转到上一个匹配项
 */
export function prevMatch(): string | null {
  if (state.matchedIdList.length === 0) return null

  state.currentMatchIndex = (state.currentMatchIndex - 1 + state.matchedIdList.length) % state.matchedIdList.length
  return state.matchedIdList[state.currentMatchIndex]
}

/**
 * 获取当前匹配项索引和总数
 */
export function getMatchPosition(): { current: number; total: number } {
  return {
    current: state.currentMatchIndex + 1,
    total: state.matchedIdList.length,
  }
}

/**
 * 跳转到指定索引的匹配项
 */
export function goToMatch(index: number): string | null {
  if (index < 0 || index >= state.matchedIdList.length) return null

  state.currentMatchIndex = index
  return state.matchedIdList[index]
}

// ─── UI 集成 ──────────────────────────────────────────────────────────────────

/**
 * 初始化侧边栏搜索输入框
 */
export function initSidebarSearch(
  entries: TraceEntry[],
  onSelect: (requestId: string) => void,
  onFilter: (filtered: TraceEntry[]) => void
): void {
  const searchInput = $('#search-input') as HTMLInputElement | null
  if (!searchInput) return

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim()
    onSearch(entries, query, onFilter)
  })

  // Enter 键跳转到下一个匹配
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const nextId = e.shiftKey ? prevMatch() : nextMatch()
      if (nextId) {
        onSelect(nextId)
      }
    }

    if (e.key === 'Escape') {
      searchInput.value = ''
      clearSearch()
      onFilter(entries)
    }
  })
}

/**
 * 更新搜索输入框的占位符（显示匹配数量）
 */
export function updateSearchPlaceholder(matchCount: number, totalCount: number): void {
  const searchInput = $('#search-input') as HTMLInputElement | null
  if (!searchInput) return

  if (state.isActive) {
    searchInput.placeholder = `${matchCount} / ${totalCount} matches`
  } else {
    searchInput.placeholder = 'Search...'
  }
}
