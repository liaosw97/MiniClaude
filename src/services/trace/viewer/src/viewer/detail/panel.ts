/**
 * 详情面板 — 显示选中条目的完整信息
 *
 * 渲染 request body（system prompt、messages、tools）和
 * response body（content、usage）。
 */

import type { TraceEntry, ContentBlock } from '../../shared/types'
import { $, esc } from '../../shared/dom'
import { fmtDuration, fmtNumber } from '../../shared/format'
import {
  getMessages,
  extractSystem,
  getRequestTools,
  getUsage,
  getResponseOutput,
  extractText,
  extractToolUses,
  extractThinking,
} from '../data/normalize'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 详情面板事件处理器 */
export interface DetailHandlers {
  onCopy?: (text: string) => void
  onJsonExpand?: (path: string) => void
}

/** 详情面板状态 */
interface DetailState {
  currentEntry: TraceEntry | null
  handlers: DetailHandlers
}

// ─── 状态管理 ─────────────────────────────────────────────────────────────────

const state: DetailState = {
  currentEntry: null,
  handlers: {},
}

// ─── 渲染函数 ─────────────────────────────────────────────────────────────────

/**
 * 渲染请求概览
 */
function renderRequestOverview(entry: TraceEntry): string {
  const request = entry.request
  const response = entry.response
  const model = request.body?.model ?? 'unknown'
  const status = response.status
  const statusClass = status >= 200 && status < 300 ? 'success' : 'error'

  return `
    <div class="detail-overview">
      <div class="detail-overview-header">
        <span class="model-pill">${esc(model)}</span>
        <span class="status-pill ${statusClass}">${status}</span>
        <span class="duration-pill">${fmtDuration(entry.duration_ms)}</span>
      </div>
      <div class="detail-overview-meta">
        <div class="meta-row">
          <span class="meta-label">Method</span>
          <span class="meta-value">${esc(request.method)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Path</span>
          <span class="meta-value">${esc(request.path)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Request ID</span>
          <span class="meta-value">${esc(entry.request_id)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Timestamp</span>
          <span class="meta-value">${esc(entry.timestamp)}</span>
        </div>
      </div>
    </div>
  `
}

/**
 * 渲染 System Prompt
 */
function renderSystemPrompt(request: any): string {
  const system = extractSystem(request)
  if (!system) return ''

  const text = typeof system === 'string' ? system : system.map(b => b.text).join('\n')

  return `
    <div class="detail-section">
      <div class="detail-section-header">
        <span class="section-title">System Prompt</span>
        <span class="section-count">${text.length} chars</span>
      </div>
      <div class="detail-section-content">
        <pre class="code-block">${esc(text)}</pre>
      </div>
    </div>
  `
}

/**
 * 渲染 Messages
 */
function renderMessages(request: any): string {
  const messages = getMessages(request)
  if (messages.length === 0) return ''

  const messageHtml = messages.map((msg, i) => {
    const role = msg.role
    const roleClass = role === 'user' ? 'user' : role === 'assistant' ? 'assistant' : 'system'

    let content = ''
    if (typeof msg.content === 'string') {
      content = msg.content
    } else if (Array.isArray(msg.content)) {
      content = extractText(msg.content)
    }

    return `
      <div class="message-item ${roleClass}">
        <div class="message-header">
          <span class="message-role">${esc(role)}</span>
          <span class="message-index">#${i + 1}</span>
        </div>
        <div class="message-content">
          <pre class="code-block">${esc(content)}</pre>
        </div>
      </div>
    `
  }).join('')

  return `
    <div class="detail-section">
      <div class="detail-section-header">
        <span class="section-title">Messages</span>
        <span class="section-count">${messages.length} messages</span>
      </div>
      <div class="detail-section-content">
        ${messageHtml}
      </div>
    </div>
  `
}

/**
 * 渲染 Tools
 */
function renderTools(request: any): string {
  const tools = getRequestTools(request)
  if (tools.length === 0) return ''

  const toolHtml = tools.map(tool => `
    <div class="tool-item">
      <div class="tool-header">
        <span class="tool-name">${esc(tool.name)}</span>
      </div>
      ${tool.description ? `<div class="tool-description">${esc(tool.description)}</div>` : ''}
    </div>
  `).join('')

  return `
    <div class="detail-section">
      <div class="detail-section-header">
        <span class="section-title">Tools</span>
        <span class="section-count">${tools.length} tools</span>
      </div>
      <div class="detail-section-content">
        ${toolHtml}
      </div>
    </div>
  `
}

/**
 * 渲染 Response Content
 */
function renderResponseContent(response: any): string {
  const output = getResponseOutput(response)
  if (output.length === 0) return ''

  // 分类内容块
  const textBlocks = output.filter(b => b.type === 'text')
  const toolUseBlocks = extractToolUses(output)
  const thinkingText = extractThinking(output)

  let html = ''

  // Thinking
  if (thinkingText) {
    html += `
      <div class="detail-section thinking-section">
        <div class="detail-section-header">
          <span class="section-title">Thinking</span>
          <span class="section-count">${thinkingText.length} chars</span>
        </div>
        <div class="detail-section-content">
          <pre class="code-block thinking">${esc(thinkingText)}</pre>
        </div>
      </div>
    `
  }

  // Text content
  if (textBlocks.length > 0) {
    const text = extractText(textBlocks)
    html += `
      <div class="detail-section">
        <div class="detail-section-header">
          <span class="section-title">Response</span>
          <span class="section-count">${text.length} chars</span>
        </div>
        <div class="detail-section-content">
          <pre class="code-block">${esc(text)}</pre>
        </div>
      </div>
    `
  }

  // Tool uses
  if (toolUseBlocks.length > 0) {
    const toolHtml = toolUseBlocks.map(tool => `
      <div class="tool-use-item">
        <div class="tool-use-header">
          <span class="tool-name">${esc(tool.name ?? '')}</span>
          <span class="tool-id">${esc(tool.id ?? '')}</span>
        </div>
        <div class="tool-use-input">
          <pre class="code-block">${esc(JSON.stringify(tool.input, null, 2))}</pre>
        </div>
      </div>
    `).join('')

    html += `
      <div class="detail-section">
        <div class="detail-section-header">
          <span class="section-title">Tool Uses</span>
          <span class="section-count">${toolUseBlocks.length} calls</span>
        </div>
        <div class="detail-section-content">
          ${toolHtml}
        </div>
      </div>
    `
  }

  return html
}

/**
 * 渲染 Usage
 */
function renderUsage(response: any): string {
  const usage = getUsage(response)
  if (!usage) return ''

  return `
    <div class="detail-section usage-section">
      <div class="detail-section-header">
        <span class="section-title">Token Usage</span>
      </div>
      <div class="detail-section-content">
        <div class="usage-grid">
          <div class="usage-item">
            <span class="usage-label">Input</span>
            <span class="usage-value">${fmtNumber(usage.input_tokens)}</span>
          </div>
          <div class="usage-item">
            <span class="usage-label">Output</span>
            <span class="usage-value">${fmtNumber(usage.output_tokens)}</span>
          </div>
          ${usage.cache_creation_input_tokens ? `
            <div class="usage-item">
              <span class="usage-label">Cache Write</span>
              <span class="usage-value">${fmtNumber(usage.cache_creation_input_tokens)}</span>
            </div>
          ` : ''}
          ${usage.cache_read_input_tokens ? `
            <div class="usage-item">
              <span class="usage-label">Cache Read</span>
              <span class="usage-value">${fmtNumber(usage.cache_read_input_tokens)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `
}

/**
 * 渲染完整详情面板
 */
export function renderDetail(entry: TraceEntry | null): void {
  const container = $('#detail')
  if (!container) return

  if (!entry) {
    container.innerHTML = `
      <div class="detail-empty">
        <p>Select a trace entry to view details</p>
      </div>
    `
    return
  }

  state.currentEntry = entry

  const html = [
    renderRequestOverview(entry),
    renderSystemPrompt(entry.request.body),
    renderMessages(entry.request.body),
    renderTools(entry.request.body),
    renderResponseContent(entry.response.body),
    renderUsage(entry.response.body),
  ].filter(Boolean).join('')

  container.innerHTML = html
}

// ─── 公开 API ─────────────────────────────────────────────────────────────────

/**
 * 初始化详情面板
 */
export function initDetail(handlers: DetailHandlers = {}): void {
  state.handlers = handlers
  renderDetail(null)
}

/**
 * 更新详情面板
 */
export function updateDetail(entry: TraceEntry): void {
  renderDetail(entry)
}

/**
 * 获取当前显示的条目
 */
export function getCurrentEntry(): TraceEntry | null {
  return state.currentEntry
}

/**
 * 清空详情面板
 */
export function clearDetail(): void {
  state.currentEntry = null
  renderDetail(null)
}
