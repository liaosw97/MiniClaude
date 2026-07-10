/**
 * 全局搜索 — Ctrl+F 在所有条目的 request/response body 中搜索
 *
 * 支持在所有条目的 request body 和 response body 中搜索文本，
 * 高亮匹配结果，支持前后跳转。
 */

import type { TraceEntry } from '../../shared/types'
import { $ } from '../../shared/dom'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 全局搜索匹配结果 */
export interface GlobalSearchMatch {
  requestId: string
  /** 匹配所在的字段路径 */
  path: string
  /** 匹配的文本片段 */
  snippet: string
  /** 匹配在原始文本中的位置 */
  startIndex: number
  endIndex: number
}

/** 全局搜索状态 */
interface GlobalSearchState {
  query: string
  isActive: boolean
  matches: GlobalSearchMatch[]
  currentMatchIndex: number
  entries: TraceEntry[]
}

// ─── 状态管理 ─────────────────────────────────────────────────────────────────

const state: GlobalSearchState = {
  query: '',
  isActive: false,
  matches: [],
  currentMatchIndex: -1,
  entries: [],
}

// ─── 搜索逻辑 ─────────────────────────────────────────────────────────────────

/**
 * 在对象中递归搜索文本
 */
function searchInObject(
  obj: any,
  query: string,
  path: string = ''
): GlobalSearchMatch[] {
  const matches: GlobalSearchMatch[] = []
  const q = query.toLowerCase()

  if (obj === null || obj === undefined) {
    return matches
  }

  if (typeof obj === 'string') {
    const index = obj.toLowerCase().indexOf(q)
    if (index !== -1) {
      // 提取匹配周围的上下文
      const start = Math.max(0, index - 30)
      const end = Math.min(obj.length, index + query.length + 30)
      const snippet = (start > 0 ? '...' : '') +
        obj.substring(start, end) +
        (end < obj.length ? '...' : '')

      matches.push({
        requestId: '',
        path,
        snippet,
        startIndex: index,
        endIndex: index + query.length,
      })
    }
    return matches
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    const str = String(obj)
    if (str.toLowerCase().includes(q)) {
      matches.push({
        requestId: '',
        path,
        snippet: str,
        startIndex: 0,
        endIndex: str.length,
      })
    }
    return matches
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const itemMatches = searchInObject(obj[i], query, `${path}[${i}]`)
      matches.push(...itemMatches)
    }
    return matches
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key
      const fieldMatches = searchInObject(value, query, fieldPath)
      matches.push(...fieldMatches)
    }
  }

  return matches
}

/**
 * 在单个条目中搜索
 */
function searchInEntry(
  entry: TraceEntry,
  query: string
): GlobalSearchMatch[] {
  const matches: GlobalSearchMatch[] = []

  // 搜索 request body
  if (entry.request.body) {
    const requestMatches = searchInObject(entry.request.body, query, 'request.body')
    matches.push(...requestMatches)
  }

  // 搜索 response body
  if (entry.response.body) {
    const responseMatches = searchInObject(entry.response.body, query, 'response.body')
    matches.push(...responseMatches)
  }

  // 设置 requestId
  for (const match of matches) {
    match.requestId = entry.request_id
  }

  return matches
}

// ─── 公开 API ─────────────────────────────────────────────────────────────────

/**
 * 初始化全局搜索
 */
export function initGlobalSearch(
  entries: TraceEntry[],
  onNavigate: (requestId: string) => void
): void {
  state.entries = entries

  const overlay = $('#global-search-overlay')
  const input = $('#global-search-input') as HTMLInputElement | null
  const prevBtn = $('#global-search-prev')
  const nextBtn = $('#global-search-next')
  const closeBtn = $('#global-search-close')
  const countSpan = $('#global-search-count')

  if (!overlay || !input) return

  // 搜索输入
  input.addEventListener('input', () => {
    const query = input.value.trim()
    if (query) {
      performSearch(query)
    } else {
      clearGlobalSearch()
    }
    updateCountDisplay()
  })

  // Enter 键跳转到下一个
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const match = e.shiftKey ? prevGlobalMatch() : nextGlobalMatch()
      if (match) {
        onNavigate(match.requestId)
        updateCountDisplay()
      }
    }

    if (e.key === 'Escape') {
      closeGlobalSearch()
    }
  })

  // 按钮事件
  prevBtn?.addEventListener('click', () => {
    const match = prevGlobalMatch()
    if (match) {
      onNavigate(match.requestId)
      updateCountDisplay()
    }
  })

  nextBtn?.addEventListener('click', () => {
    const match = nextGlobalMatch()
    if (match) {
      onNavigate(match.requestId)
      updateCountDisplay()
    }
  })

  closeBtn?.addEventListener('click', () => {
    closeGlobalSearch()
  })
}

/**
 * 打开全局搜索
 */
export function openGlobalSearch(): void {
  const overlay = $('#global-search-overlay')
  const input = $('#global-search-input') as HTMLInputElement | null

  if (overlay) {
    overlay.style.display = 'block'
  }

  if (input) {
    input.focus()
    input.select()
  }

  state.isActive = true
}

/**
 * 关闭全局搜索
 */
export function closeGlobalSearch(): void {
  const overlay = $('#global-search-overlay')

  if (overlay) {
    overlay.style.display = 'none'
  }

  clearGlobalSearch()
  state.isActive = false
}

/**
 * 执行全局搜索
 */
export function performSearch(query: string): GlobalSearchMatch[] {
  state.query = query
  state.matches = []
  state.currentMatchIndex = -1

  for (const entry of state.entries) {
    const entryMatches = searchInEntry(entry, query)
    state.matches.push(...entryMatches)
  }

  if (state.matches.length > 0) {
    state.currentMatchIndex = 0
  }

  return state.matches
}

/**
 * 清除搜索结果
 */
export function clearGlobalSearch(): void {
  state.query = ''
  state.matches = []
  state.currentMatchIndex = -1
}

/**
 * 跳转到下一个匹配
 */
export function nextGlobalMatch(): GlobalSearchMatch | null {
  if (state.matches.length === 0) return null

  state.currentMatchIndex = (state.currentMatchIndex + 1) % state.matches.length
  return state.matches[state.currentMatchIndex]
}

/**
 * 跳转到上一个匹配
 */
export function prevGlobalMatch(): GlobalSearchMatch | null {
  if (state.matches.length === 0) return null

  state.currentMatchIndex = (state.currentMatchIndex - 1 + state.matches.length) % state.matches.length
  return state.matches[state.currentMatchIndex]
}

/**
 * 获取当前匹配位置
 */
export function getGlobalMatchPosition(): { current: number; total: number } {
  return {
    current: state.currentMatchIndex + 1,
    total: state.matches.length,
  }
}

/**
 * 获取当前匹配
 */
export function getCurrentMatch(): GlobalSearchMatch | null {
  if (state.currentMatchIndex < 0 || state.currentMatchIndex >= state.matches.length) {
    return null
  }
  return state.matches[state.currentMatchIndex]
}

/**
 * 获取搜索状态
 */
export function getGlobalSearchState(): Readonly<GlobalSearchState> {
  return { ...state }
}

/**
 * 更新条目列表（当条目变化时调用）
 */
export function updateEntries(entries: TraceEntry[]): void {
  state.entries = entries

  // 如果有活跃搜索，重新执行搜索
  if (state.query) {
    performSearch(state.query)
  }
}

// ─── UI 辅助 ──────────────────────────────────────────────────────────────────

/**
 * 更新匹配计数显示
 */
function updateCountDisplay(): void {
  const countSpan = $('#global-search-count')
  if (!countSpan) return

  if (state.matches.length === 0 && state.query) {
    countSpan.textContent = 'No matches'
  } else if (state.matches.length > 0) {
    countSpan.textContent = `${state.currentMatchIndex + 1} / ${state.matches.length}`
  } else {
    countSpan.textContent = ''
  }
}

/**
 * 高亮文本中的匹配部分
 */
export function highlightMatch(text: string, query: string): string {
  if (!query) return text

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}
