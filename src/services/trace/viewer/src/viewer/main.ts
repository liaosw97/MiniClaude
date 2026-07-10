/**
 * Viewer 入口 — 模式检测 + 初始化调度
 *
 * 集成所有 viewer 模块，实现：
 * - 4 种启动模式检测（live/embedded/lazy/file-drop）
 * - 侧边栏渲染和导航
 * - 详情面板更新
 * - 搜索功能（侧边栏 + 全局）
 * - Diff 对比
 * - 键盘导航
 * - i18n 支持
 */

import { initTheme, toggleTheme } from '../shared/theme'
import { initI18n, renderLangSelect, isI18nEmpty } from '../shared/i18n'
import { $ } from '../shared/dom'
import type { TraceEntry } from '../shared/types'
import i18nData from '../../viewer_i18n.json'

// 数据层
import { getMessages, extractSystem, getUsage, getResponseOutput } from './data/normalize'
import { buildStubListFromFile, getFullEntry, getStubs, shouldUseLazyLoading } from './data/lazy'
import { SSEManager, type SSEStatus } from './data/sse'

// 搜索层
import { initSidebarSearch, onSearch, clearSearch } from './search/sidebar-search'
import { initGlobalSearch, openGlobalSearch, closeGlobalSearch } from './search/global-search'

// 侧边栏
import { initSidebar, renderSidebar, selectEntry, selectNext, selectPrev, selectFirst, selectLast, updateEntries as updateSidebarEntries } from './sidebar/render'

// 详情面板
import { initDetail, updateDetail, clearDetail } from './detail/panel'

// Diff 系统
import { diffRequest } from './diff/engine'
import { renderStructuralDiff } from './diff/render'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

type ViewerMode = 'live' | 'embedded' | 'lazy' | 'file-drop'

interface ViewerState {
  mode: ViewerMode
  entries: TraceEntry[]
  selectedId: string | null
  sseManager: SSEManager | null
}

// ─── 状态管理 ─────────────────────────────────────────────────────────────────

const MAX_DEDUP_ENTRIES = 1000

const state: ViewerState = {
  mode: 'file-drop',
  entries: [],
  selectedId: null,
  sseManager: null,
}

/**
 * 去重并限制窗口大小
 */
function dedupEntries(entries: TraceEntry[]): TraceEntry[] {
  const seen = new Set<string>()
  const result: TraceEntry[] = []

  for (const entry of entries) {
    if (!seen.has(entry.request_id)) {
      seen.add(entry.request_id)
      result.push(entry)
    }
  }

  // 限制窗口大小，保留最新的记录（数组末尾）
  if (result.length > MAX_DEDUP_ENTRIES) {
    return result.slice(-MAX_DEDUP_ENTRIES)
  }

  return result
}

// ─── 模式检测 ─────────────────────────────────────────────────────────────────

/**
 * 检测启动模式
 */
function detectMode(): ViewerMode {
  // 嵌入数据模式（trace export 生成的 HTML）
  if (typeof (window as any)._traceData !== 'undefined') {
    return 'embedded'
  }

  // 懒加载模式（内嵌元数据）
  if (typeof (window as any).EMBEDDED_TRACE_META !== 'undefined') {
    return 'lazy'
  }

  // 实时模式（trace server 注入）
  if (typeof (window as any).LIVE_MODE !== 'undefined' && (window as any).LIVE_MODE) {
    return 'live'
  }

  // 默认：文件拖放模式
  return 'file-drop'
}

// ─── 初始化函数 ───────────────────────────────────────────────────────────────

/**
 * 初始化通用 UI
 */
function initCommonUi(): void {
  initTheme()

  // 主题切换按钮
  const themeBtn = $('#theme-toggle')
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme)
  }

  // 先初始化 i18n，再渲染语言选择器
  initI18n(i18nData)
  if (isI18nEmpty()) {
    const langSelect = document.getElementById('lang-select')
    if (langSelect) langSelect.style.display = 'none'
  } else {
    renderLangSelect('lang-select')
  }

  // 导出按钮
  initExportButton()
}

/**
 * 初始化侧边栏和详情面板
 */
function initViewerPanels(): void {
  // 初始化详情面板
  initDetail({
    onCopy: (text) => {
      navigator.clipboard.writeText(text).catch(console.error)
    },
  })

  // 初始化侧边栏
  initSidebar(state.entries, {
    onSelect: (requestId) => {
      state.selectedId = requestId
      const entry = state.entries.find(e => e.request_id === requestId)
      if (entry) {
        updateDetail(entry)
      }
    },
  })

  // 初始化侧边栏搜索
  initSidebarSearch(
    state.entries,
    (requestId) => {
      selectEntry(requestId)
    },
    (filtered) => {
      // 更新侧边栏显示
      updateSidebarEntries(filtered)
    }
  )

  // 初始化全局搜索
  initGlobalSearch(state.entries, (requestId) => {
    selectEntry(requestId)
  })
}

/**
 * 初始化键盘导航
 */
function initKeyboardNavigation(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd+F: 全局搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault()
      openGlobalSearch()
    }

    // Escape: 关闭搜索
    if (e.key === 'Escape') {
      closeGlobalSearch()
    }

    // j/k 导航（仅在非输入框时）
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return
    }

    switch (e.key) {
      case 'j':
        e.preventDefault()
        selectNext()
        break
      case 'k':
        e.preventDefault()
        selectPrev()
        break
      case 'Home':
        e.preventDefault()
        selectFirst()
        break
      case 'End':
        e.preventDefault()
        selectLast()
        break
      case 'PageDown':
        e.preventDefault()
        for (let i = 0; i < 10; i++) selectNext()
        break
      case 'PageUp':
        e.preventDefault()
        for (let i = 0; i < 10; i++) selectPrev()
        break
    }
  })
}

/**
 * 更新状态指示器
 */
function updateLiveStatus(status: SSEStatus): void {
  const stats = $('#stats')
  if (!stats) return

  const statusHtml = `<span class="stat-item">
    <span class="stat-dot" style="background:${status === 'connected' ? 'var(--green)' : 'var(--red)'}"></span>
    <span>${status}</span>
  </span>`

  // 保留其他统计信息
  const existing = stats.querySelector('.live-status')
  if (existing) {
    existing.innerHTML = statusHtml
  } else {
    const span = document.createElement('span')
    span.className = 'live-status'
    span.innerHTML = statusHtml
    stats.appendChild(span)
  }
}

/**
 * 显示主区域
 */
function showMainArea(): void {
  const mainArea = $('#main-area')
  const dropZone = $('#drop-zone')
  if (mainArea) mainArea.style.display = 'flex'
  if (dropZone) dropZone.style.display = 'none'
}

/**
 * 加载历史数据
 */
async function loadHistoricalData(): Promise<TraceEntry[]> {
  try {
    const response = await fetch('/api/sessions')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const sessions = await response.json()
    if (!sessions || sessions.length === 0) {
      return []
    }

    // 加载最近 1 个会话
    const latestSession = sessions[0]
    const tracesResponse = await fetch(`/api/traces/${latestSession.id}`)

    if (!tracesResponse.ok) {
      throw new Error(`HTTP ${tracesResponse.status}`)
    }

    const traces = await tracesResponse.json()
    return Array.isArray(traces) ? traces : []
  } catch (error) {
    console.error('Failed to load historical data:', error)
    // 显示 UI 错误提示
    const sidebar = $('#sidebar')
    if (sidebar) {
      sidebar.innerHTML = '<div class="error-banner">Failed to load history. Waiting for live traces...</div>'
    }
    return []
  }
}

/**
 * 导出当前 trace 数据为自包含 HTML
 * 从服务器获取 viewer.html 模板，注入当前数据后触发下载
 */
async function exportSelfContainedHtml(): Promise<void> {
  if (state.entries.length === 0) {
    alert('No trace data to export')
    return
  }

  try {
    // 从服务器获取原始 viewer.html 模板
    const resp = await fetch('/')
    if (!resp.ok) throw new Error(`Failed to fetch template: ${resp.status}`)
    const template = await resp.text()

    // 将数据编码为 base64 并注入
    const jsonStr = JSON.stringify(state.entries)
    const dataBase64 = btoa(unescape(encodeURIComponent(jsonStr)))
    const exportHtml = template.replace(
      '</head>',
      `<script>window._traceData = JSON.parse(decodeURIComponent(escape(atob('${dataBase64}'))));<` + `/script></head>`
    )

    // 触发下载
    const blob = new Blob([exportHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trace-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export failed:', err)
    alert(`Export failed: ${err}`)
  }
}

/**
 * 初始化导出按钮
 */
function initExportButton(): void {
  const actions = $('#viewer-actions')
  if (!actions) return

  const btn = document.createElement('button')
  btn.className = 'act-btn'
  btn.textContent = 'Export HTML'
  btn.title = 'Export as self-contained HTML'
  btn.addEventListener('click', exportSelfContainedHtml)
  actions.appendChild(btn)
}

// ─── 模式初始化 ───────────────────────────────────────────────────────────────

/**
 * 初始化文件拖放模式
 */
function initFileDropZone(): void {
  const dropZone = $('#drop-zone')
  if (!dropZone) return

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.stopPropagation()
    dropZone.classList.add('drag-over')
  })

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over')
  })

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    dropZone.classList.remove('drag-over')

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      await loadFile(files[0])
    }
  })
}

/**
 * 加载 JSONL 文件
 */
async function loadFile(file: File): Promise<void> {
  // 检查是否需要懒加载
  const text = await file.text()
  const lines = text.trim().split('\n')

  if (shouldUseLazyLoading(lines.length)) {
    // 懒加载模式
    const stubs = buildStubListFromFile(file)
    state.entries = stubs.map(s => ({
      request_id: s.request_id,
      turn: s.turn,
      timestamp: s.timestamp,
      duration_ms: s.duration_ms,
      request: { method: s.method, path: s.path, body: null },
      response: { status: s.status, body: null },
      transport: s.transport,
    }))
  } else {
    // 完整加载
    state.entries = lines
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)
  }

  if (state.entries.length === 0) {
    console.warn('No valid entries found in file')
    return
  }

  showMainArea()
  initViewerPanels()
  renderSidebar()
}

/**
 * 初始化实时 SSE 模式
 */
async function initLiveMode(): Promise<void> {
  // 显示 loading 状态
  const sidebar = $('#sidebar')
  if (sidebar) {
    sidebar.innerHTML = '<div class="loading">Loading history...</div>'
  }

  // 先加载历史数据
  const historicalData = await loadHistoricalData()
  state.entries = historicalData

  // 初始化 SSE
  state.sseManager = new SSEManager({
    onRecord: (entry) => {
      // 去重检查
      if (!state.entries.some(e => e.request_id === entry.request_id)) {
        state.entries.push(entry)
        // 去重并限制窗口大小
        state.entries = dedupEntries(state.entries)
        updateSidebarEntries(state.entries)
      }
    },
    onStatusChange: (status) => {
      updateLiveStatus(status)
    },
    onError: (error) => {
      console.error('SSE error:', error)
    },
  })

  state.sseManager.connect()
  showMainArea()
  initViewerPanels()
  renderSidebar()
}

/**
 * 初始化嵌入数据模式
 */
function initEmbeddedMode(): void {
  const data = (window as any)._traceData
  if (data && Array.isArray(data)) {
    state.entries = data
    showMainArea()
    initViewerPanels()
    renderSidebar()
  }
}

/**
 * 初始化懒加载模式
 */
function initLazyMode(): void {
  const meta = (window as any).EMBEDDED_TRACE_META
  if (meta && Array.isArray(meta)) {
    state.entries = meta
    showMainArea()
    initViewerPanels()
    renderSidebar()
  }
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

function main(): void {
  initCommonUi()
  initKeyboardNavigation()

  const mode = detectMode()
  state.mode = mode
  console.log(`Viewer mode: ${mode}`)

  switch (mode) {
    case 'live':
      initLiveMode()
      break

    case 'embedded':
      initEmbeddedMode()
      break

    case 'lazy':
      initLazyMode()
      break

    case 'file-drop':
    default:
      initFileDropZone()
      break
  }
}

// 启动
main()
