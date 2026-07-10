/**
 * Dashboard 会话详情
 *
 * 负责渲染会话详情面板，支持：
 * - iframe 嵌入会话 HTML
 * - 导出 JSONL/LOG/HTML 格式
 * - 返回会话列表
 */

import type { SessionMetadata } from '../shared/types'
import { $, esc } from '../shared/dom'
import { state, setSelectedSession } from './state'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 会话详情事件处理器 */
export interface SessionDetailHandlers {
  onBack?: () => void
}

// ─── 渲染函数 ─────────────────────────────────────────────────────────────────

/**
 * 渲染会话详情
 */
export function renderDetail(sessionId: string): void {
  const detail = $('#detail')
  if (!detail) return

  setSelectedSession(sessionId)

  detail.style.display = 'block'
  detail.innerHTML = `
    <div class="detail-header">
      <button class="back-btn" id="detail-back">← Back</button>
      <h3>Session: ${esc(sessionId)}</h3>
      <div class="detail-actions">
        <button class="export-btn" data-format="jsonl">JSONL</button>
        <button class="export-btn" data-format="log">LOG</button>
        <button class="export-btn" data-format="html">HTML</button>
      </div>
    </div>
    <div class="viewer-frame-wrap">
      <iframe src="/api/sessions/${encodeURIComponent(sessionId)}/html"></iframe>
    </div>
  `

  // 返回按钮
  const backBtn = $('#detail-back')
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      clearDetail()
      setSelectedSession(null)
    })
  }

  // 导出按钮
  detail.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = (btn as HTMLElement).dataset.format
      if (format) {
        exportSession(sessionId, format)
      }
    })
  })
}

/**
 * 清空详情面板
 */
export function clearDetail(): void {
  const detail = $('#detail')
  if (detail) {
    detail.style.display = 'none'
    detail.innerHTML = ''
  }
}

/**
 * 导出会话
 */
function exportSession(sessionId: string, format: string): void {
  let url: string

  switch (format) {
    case 'jsonl':
      url = `/api/sessions/${encodeURIComponent(sessionId)}/export/jsonl`
      break
    case 'log':
      url = `/api/sessions/${encodeURIComponent(sessionId)}/export/log`
      break
    case 'html':
      url = `/api/sessions/${encodeURIComponent(sessionId)}/html`
      break
    default:
      console.error('Unknown export format:', format)
      return
  }

  // 打开新窗口下载
  window.open(url, '_blank')
}

/**
 * 初始化会话详情
 */
export function initSessionDetail(handlers: SessionDetailHandlers = {}): void {
  // 初始状态隐藏详情面板
  clearDetail()
}

/**
 * 更新会话详情（当会话数据变化时）
 */
export function updateSessionDetail(): void {
  if (state.selectedSessionId) {
    renderDetail(state.selectedSessionId)
  }
}
