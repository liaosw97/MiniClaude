/**
 * Dashboard 入口 — 会话列表 + 实时刷新
 *
 * 集成所有 dashboard 模块，实现：
 * - 会话列表加载和渲染
 * - 搜索过滤
 * - Agent 筛选
 * - 会话详情查看（iframe 嵌入）
 * - 导出功能（JSONL/LOG/HTML）
 * - SSE 实时刷新
 * - 定时轮询降级
 */

import { initTheme, toggleTheme } from '../shared/theme'
import { $ } from '../shared/dom'
import type { SessionMetadata } from '../shared/types'

// Dashboard 模块
import { state, setSessions, setSearch, setSelectedSession } from './state'
import { initSessionList, renderSessionList, renderOverview, renderAgentChips, updateSessionList } from './session-list'
import { initSessionDetail, renderDetail, clearDetail } from './session-detail'

// ─── 初始化函数 ───────────────────────────────────────────────────────────────

/**
 * 初始化通用 UI
 */
function initCommonUi(): void {
  initTheme()

  const themeBtn = $('#theme-toggle')
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme)
  }
}

/**
 * 从 API 加载会话列表
 */
async function loadSessions(): Promise<void> {
  try {
    const resp = await fetch('/api/sessions')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const sessions: SessionMetadata[] = await resp.json()
    setSessions(sessions)
    updateSessionList(sessions)
  } catch (err) {
    console.error('Failed to load sessions:', err)
    showError('Failed to load sessions. Is the trace server running?')
  }
}

/**
 * 显示错误
 */
function showError(message: string): void {
  const container = $('#session-list')
  if (container) {
    container.innerHTML = `
      <div class="session-error">
        <p>${message}</p>
      </div>
    `
  }
}

/**
 * 初始化搜索
 */
function initSearch(): void {
  const searchInput = $('#search-input') as HTMLInputElement
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      setSearch(searchInput.value)
      renderSessionList()
      renderOverview()
      renderAgentChips()
    })
  }
}

/**
 * 初始化 SSE 实时刷新
 */
function initLiveRefresh(): void {
  if (!window.EventSource) {
    console.warn('EventSource not supported, using polling')
    return
  }

  const events = new EventSource('/events')

  events.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'refresh' || data.type === 'record') {
        loadSessions()
      }
    } catch {
      // ignore
    }
  }

  events.onerror = () => {
    console.log('SSE disconnected, falling back to polling')
  }
}

/**
 * 初始化定时轮询（SSE 降级方案）
 */
function initPolling(): void {
  setInterval(() => loadSessions().catch(console.error), 5000)
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

function main(): void {
  initCommonUi()

  // 初始化搜索
  initSearch()

  // 初始化会话列表
  initSessionList(state.sessions, {
    onSelect: (sessionId) => {
      renderDetail(sessionId)
    },
    onRefresh: () => {
      loadSessions()
    },
  })

  // 初始化会话详情
  initSessionDetail()

  // 加载数据
  loadSessions()

  // SSE 实时刷新
  initLiveRefresh()

  // 降级：5 秒轮询
  initPolling()
}

// 启动
main()
