/**
 * Dashboard 会话列表渲染
 *
 * 负责渲染：
 * - 概览指标（总会话数、总 token、总时长）
 * - 会话列表表格
 * - Agent 筛选芯片
 */

import type { SessionMetadata } from '../shared/types'
import { $, esc } from '../shared/dom'
import { fmtNumber, fmtTokens, fmtTableTime } from '../shared/format'
import { state, computeOverviewMetrics, getUniqueAgents, setAgentFilter } from './state'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 会话列表事件处理器 */
export interface SessionListHandlers {
  onSelect: (sessionId: string) => void
  onRefresh?: () => void
}

// ─── 渲染函数 ─────────────────────────────────────────────────────────────────

/**
 * 渲染概览指标
 */
export function renderOverview(): void {
  const overview = $('#overview')
  if (!overview) return

  const metrics = computeOverviewMetrics()

  overview.innerHTML = `
    <div class="overview-metric">
      <div class="metric-label">Sessions</div>
      <div class="metric-value">${fmtNumber(metrics.totalSessions)}</div>
    </div>
    <div class="overview-metric">
      <div class="metric-label">Total Tokens</div>
      <div class="metric-value">${fmtTokens(metrics.totalTokens)}</div>
    </div>
    <div class="overview-metric">
      <div class="metric-label">Total Turns</div>
      <div class="metric-value">${fmtNumber(metrics.totalTurns)}</div>
    </div>
    <div class="overview-metric">
      <div class="metric-label">Models</div>
      <div class="metric-value">${metrics.uniqueModels}</div>
    </div>
  `
}

/**
 * 渲染 Agent 筛选芯片
 */
export function renderAgentChips(): void {
  const container = $('#agent-chips')
  if (!container) return

  const agents = getUniqueAgents()

  if (agents.length <= 1) {
    container.innerHTML = ''
    return
  }

  const chips = agents.map(agent => `
    <button class="agent-chip ${agent === state.agentFilter ? 'active' : ''}"
            data-agent="${esc(agent)}">
      ${esc(agent)}
    </button>
  `).join('')

  container.innerHTML = chips

  // 点击事件
  container.querySelectorAll('.agent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const agent = (chip as HTMLElement).dataset.agent ?? null
      setAgentFilter(agent === state.agentFilter ? null : agent)
      renderSessionList()
      renderAgentChips()
    })
  })
}

/**
 * 渲染会话列表
 */
export function renderSessionList(): void {
  const container = $('#session-list')
  if (!container) return

  if (state.filtered.length === 0) {
    container.innerHTML = `
      <div class="session-empty">
        <p>No sessions found</p>
      </div>
    `
    return
  }

  const rows = state.filtered.map(s => `
    <tr data-id="${esc(s.id)}" class="${s.id === state.selectedSessionId ? 'active' : ''}">
      <td><span class="model-pill">${esc(s.model)}</span></td>
      <td>${esc(s.id.slice(0, 8))}...</td>
      <td>${fmtNumber(s.turns)}</td>
      <td><span class="token-pill">${fmtTokens(s.totalInputTokens + s.totalOutputTokens)}</span></td>
      <td>${fmtTableTime(s.lastActivity)}</td>
    </tr>
  `).join('')

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Model</th>
          <th>Session</th>
          <th>Turns</th>
          <th>Tokens</th>
          <th>Last Activity</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

/**
 * 初始化会话列表
 */
export function initSessionList(
  sessions: SessionMetadata[],
  handlers: SessionListHandlers
): void {
  // 渲染会话列表
  renderSessionList()

  // 渲染概览
  renderOverview()

  // 渲染 Agent 芯片
  renderAgentChips()

  // 点击事件
  const container = $('#session-list')
  if (container) {
    container.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest('tr[data-id]') as HTMLElement
      if (row) {
        const id = row.dataset.id
        if (id) {
          handlers.onSelect(id)
        }
      }
    })
  }

  // 刷新按钮
  const refreshBtn = $('#refresh-btn')
  if (refreshBtn && handlers.onRefresh) {
    refreshBtn.addEventListener('click', handlers.onRefresh)
  }
}

/**
 * 更新会话列表
 */
export function updateSessionList(sessions: SessionMetadata[]): void {
  renderSessionList()
  renderOverview()
  renderAgentChips()
}
