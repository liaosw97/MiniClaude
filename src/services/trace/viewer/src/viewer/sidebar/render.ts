/**
 * 侧边栏渲染 — trace 条目列表
 *
 * 负责渲染侧边栏中的 trace 条目列表，支持：
 * - 分组显示（按 Model/Turn/Session）
 * - 排序切换
 * - 选中状态管理
 * - 路径过滤
 */

import type { TraceEntry } from '../../shared/types'
import { $, esc } from '../../shared/dom'
import { fmtDuration, fmtTime } from '../../shared/format'
import { isMatching } from '../search/sidebar-search'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 排序模式 */
export type SortMode = 'model' | 'turn' | 'session' | 'time'

/** 侧边栏事件处理器 */
export interface SidebarHandlers {
  onSelect: (requestId: string) => void
  onDiff?: (requestId: string) => void
}

/** 侧边栏状态 */
interface SidebarState {
  entries: TraceEntry[]
  selectedId: string | null
  sortMode: SortMode
  pathFilter: string | null
  handlers: SidebarHandlers
}

// ─── 状态管理 ─────────────────────────────────────────────────────────────────

const state: SidebarState = {
  entries: [],
  selectedId: null,
  sortMode: 'time',
  pathFilter: null,
  handlers: { onSelect: () => {} },
}

// ─── 分组和排序 ───────────────────────────────────────────────────────────────

/**
 * 按时间戳降序排序条目
 */
function sortEntries(entries: TraceEntry[]): TraceEntry[] {
  return [...entries].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0

    // 无效 timestamp 排到末尾
    if (timeA === 0 && timeB === 0) {
      return a.request_id.localeCompare(b.request_id)
    }
    if (timeA === 0) return 1
    if (timeB === 0) return -1

    // 时间降序，相同时按 request_id 排序
    if (timeA === timeB) {
      return a.request_id.localeCompare(b.request_id)
    }
    return timeB - timeA
  })
}

/**
 * 按排序模式对条目分组
 */
function groupEntries(entries: TraceEntry[], mode: SortMode): Map<string, TraceEntry[]> {
  const groups = new Map<string, TraceEntry[]>()

  for (const entry of entries) {
    let key: string

    switch (mode) {
      case 'model':
        key = entry.request.body?.model ?? 'unknown'
        break
      case 'turn':
        key = `Turn ${entry.turn || '?'}`
        break
      case 'session':
        key = entry.request_id.slice(0, 8)
        break
      case 'time':
      default:
        key = new Date(entry.timestamp).toLocaleDateString()
        break
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(entry)
  }

  return groups
}

/**
 * 过滤条目（按路径）
 */
function filterByPath(entries: TraceEntry[], pathFilter: string | null): TraceEntry[] {
  if (!pathFilter) return entries
  return entries.filter(e => e.request.path === pathFilter)
}

/**
 * 获取所有唯一路径
 */
export function getUniquePaths(entries: TraceEntry[]): string[] {
  const paths = new Set(entries.map(e => e.request.path).filter(Boolean))
  return Array.from(paths).sort()
}

// ─── 渲染函数 ─────────────────────────────────────────────────────────────────

/**
 * 创建单个侧边栏条目元素
 */
export function createSidebarItem(entry: TraceEntry): HTMLElement {
  const isSelected = entry.request_id === state.selectedId
  const isSearchMatch = isMatching(entry.request_id)

  const item = document.createElement('div')
  item.className = `sidebar-item${isSelected ? ' selected' : ''}${!isSearchMatch ? ' dimmed' : ''}`
  item.dataset.id = entry.request_id

  const model = entry.request.body?.model ?? 'unknown'
  const method = entry.request.method
  const path = entry.request.path
  const status = entry.response.status
  const duration = entry.duration_ms

  item.innerHTML = `
    <div class="sidebar-item-header">
      <span class="model-pill">${esc(model)}</span>
      <span class="status-dot ${status >= 200 && status < 300 ? 'success' : 'error'}"></span>
    </div>
    <div class="sidebar-item-path">${esc(path)}</div>
    <div class="sidebar-item-meta">
      <span class="method">${esc(method)}</span>
      <span class="duration">${fmtDuration(duration)}</span>
      <span class="time">${fmtTime(entry.timestamp)}</span>
    </div>
  `

  // 点击事件
  item.addEventListener('click', () => {
    state.selectedId = entry.request_id
    state.handlers.onSelect(entry.request_id)
    updateSelection()
  })

  return item
}

/**
 * 渲染侧边栏分组
 */
function renderGroup(groupName: string, entries: TraceEntry[]): HTMLElement {
  const group = document.createElement('div')
  group.className = 'sidebar-group'

  const header = document.createElement('div')
  header.className = 'sidebar-group-header'
  header.textContent = `${groupName} (${entries.length})`
  header.addEventListener('click', () => {
    group.classList.toggle('collapsed')
  })

  const items = document.createElement('div')
  items.className = 'sidebar-group-items'

  for (const entry of entries) {
    items.appendChild(createSidebarItem(entry))
  }

  group.appendChild(header)
  group.appendChild(items)
  return group
}

/**
 * 渲染完整侧边栏
 */
export function renderSidebar(): void {
  const container = $('#sidebar')
  if (!container) return

  // 清空容器
  container.innerHTML = ''

  // 排序后再过滤
  let entries = sortEntries(state.entries)
  entries = filterByPath(entries, state.pathFilter)

  // 应用搜索过滤（由搜索模块处理）
  // entries 已经通过 isMatching 进行了 dimmed 处理

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="sidebar-empty">
        <p>No trace entries</p>
      </div>
    `
    return
  }

  // 分组渲染
  const groups = groupEntries(entries, state.sortMode)

  for (const [groupName, groupEntries] of groups) {
    container.appendChild(renderGroup(groupName, groupEntries))
  }

  // 滚动到选中项
  scrollToSelected()
}

/**
 * 更新选中状态（不重新渲染整个列表）
 */
function updateSelection(): void {
  const container = $('#sidebar')
  if (!container) return

  // 移除旧的选中状态
  container.querySelectorAll('.sidebar-item.selected').forEach(el => {
    el.classList.remove('selected')
  })

  // 添加新的选中状态
  if (state.selectedId) {
    const selectedItem = container.querySelector(`[data-id="${state.selectedId}"]`)
    if (selectedItem) {
      selectedItem.classList.add('selected')
      selectedItem.scrollIntoView({ block: 'nearest' })
    }
  }
}

/**
 * 滚动到选中项
 */
function scrollToSelected(): void {
  if (!state.selectedId) return

  const container = $('#sidebar')
  if (!container) return

  const selected = container.querySelector(`[data-id="${state.selectedId}"]`)
  if (selected) {
    selected.scrollIntoView({ block: 'nearest' })
  }
}

// ─── 公开 API ─────────────────────────────────────────────────────────────────

/**
 * 初始化侧边栏
 */
export function initSidebar(
  entries: TraceEntry[],
  handlers: SidebarHandlers
): void {
  state.entries = entries
  state.handlers = handlers
  state.selectedId = null

  renderSidebar()
}

/**
 * 更新条目列表
 */
export function updateEntries(entries: TraceEntry[]): void {
  state.entries = entries
  renderSidebar()
}

/**
 * 选中指定条目
 */
export function selectEntry(requestId: string): void {
  state.selectedId = requestId
  state.handlers.onSelect(requestId)
  updateSelection()
}

/**
 * 获取当前选中的条目 ID
 */
export function getSelectedId(): string | null {
  return state.selectedId
}

/**
 * 设置排序模式
 */
export function setSortMode(mode: SortMode): void {
  state.sortMode = mode
  renderSidebar()
}

/**
 * 获取当前排序模式
 */
export function getSortMode(): SortMode {
  return state.sortMode
}

/**
 * 设置路径过滤
 */
export function setPathFilter(path: string | null): void {
  state.pathFilter = path
  renderSidebar()
}

/**
 * 获取当前路径过滤
 */
export function getPathFilter(): string | null {
  return state.pathFilter
}

/**
 * 导航到下一个条目
 */
export function selectNext(): string | null {
  if (state.entries.length === 0) return null

  const currentIndex = state.entries.findIndex(e => e.request_id === state.selectedId)
  const nextIndex = (currentIndex + 1) % state.entries.length
  const nextEntry = state.entries[nextIndex]

  if (nextEntry) {
    selectEntry(nextEntry.request_id)
    return nextEntry.request_id
  }

  return null
}

/**
 * 导航到上一个条目
 */
export function selectPrev(): string | null {
  if (state.entries.length === 0) return null

  const currentIndex = state.entries.findIndex(e => e.request_id === state.selectedId)
  const prevIndex = (currentIndex - 1 + state.entries.length) % state.entries.length
  const prevEntry = state.entries[prevIndex]

  if (prevEntry) {
    selectEntry(prevEntry.request_id)
    return prevEntry.request_id
  }

  return null
}

/**
 * 导航到第一个条目
 */
export function selectFirst(): string | null {
  if (state.entries.length === 0) return null

  const first = state.entries[0]
  selectEntry(first.request_id)
  return first.request_id
}

/**
 * 导航到最后一个条目
 */
export function selectLast(): string | null {
  if (state.entries.length === 0) return null

  const last = state.entries[state.entries.length - 1]
  selectEntry(last.request_id)
  return last.request_id
}
