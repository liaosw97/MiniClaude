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
  const ts = new Date(entry.timestamp)
  const timeStr = ts.toLocaleString()

  return `
    <div class="detail-overview">
      <div class="overview-top-bar">
        <span class="model-pill">${esc(model)}</span>
        <span class="status-pill ${statusClass}">${status}</span>
        <span class="duration-pill">${fmtDuration(entry.duration_ms)}</span>
      </div>
      <table class="meta-table">
        <tr>
          <td class="meta-label">Method</td>
          <td class="meta-value"><code>${esc(request.method)}</code></td>
          <td class="meta-label">Status</td>
          <td class="meta-value"><span class="status-badge ${statusClass}">${status}</span></td>
        </tr>
        <tr>
          <td class="meta-label">Path</td>
          <td class="meta-value path-cell" colspan="3"><code>${esc(request.path)}</code></td>
        </tr>
        <tr>
          <td class="meta-label">Request ID</td>
          <td class="meta-value mono">${esc(entry.request_id)}</td>
          <td class="meta-label">Duration</td>
          <td class="meta-value mono">${fmtDuration(entry.duration_ms)}</td>
        </tr>
        <tr>
          <td class="meta-label">Timestamp</td>
          <td class="meta-value mono" colspan="3">${esc(timeStr)}</td>
        </tr>
      </table>
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
        <span class="section-badges">
          <span class="section-badge">${text.split('\n').length} lines</span>
          <span class="section-badge">${text.length.toLocaleString()} chars</span>
        </span>
      </div>
      <div class="detail-section-content sysprompt-wrap">
        ${renderMarkdownContent(text)}
      </div>
    </div>
  `
}

/**
 * 将 Markdown 文本渲染为 HTML
 */
function renderMarkdownContent(text: string): string {
  const lines = text.split('\n')
  const html: string[] = []
  let i = 0

  // 先检查文本是否以类 XML 标签开头（如 <type>），如果是则整个作为 XML 块展示
  const firstNonEmpty = lines.find(l => l.trim() !== '')
  const isXmlDoc = firstNonEmpty && /^\s*<\w+[\s>]/.test(firstNonEmpty)

  if (isXmlDoc) {
    // 递归处理，让下方逐行逻辑接管
    // 这里不做特殊处理，直接进入下面的 while 循环
  }

  while (i < lines.length) {
    const line = lines[i]!

    // 代码块 ```lang ... ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!)
        i++
      }
      i++ // skip closing ```
      html.push(`<div class="md-code-block">
        ${lang ? `<div class="md-code-lang">${esc(lang)}</div>` : ''}
        <pre class="code-block"><code>${esc(codeLines.join('\n'))}</code></pre>
      </div>`)
      continue
    }

    // 标题 ##
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1]!.length
      const title = headingMatch[2]!
      html.push(`<div class="md-heading md-h${level}">${esc(title)}</div>`)
      i++
      continue
    }

    // 水平线 ---
    if (/^---+\s*$/.test(line)) {
      html.push(`<hr class="md-hr">`)
      i++
      continue
    }

    // 引用块 >
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [line.slice(2)]
      i++
      while (i < lines.length && lines[i]!.startsWith('> ')) {
        quoteLines.push(lines[i]!.slice(2))
        i++
      }
      html.push(`<blockquote class="md-blockquote"><p>${esc(quoteLines.join('\n'))}</p></blockquote>`)
      continue
    }

    // 列表 - 或 *
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [line.replace(/^[-*]\s+/, '')]
      i++
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^[-*]\s+/, ''))
        i++
      }
      const listHtml = items.map(item => `<li>${esc(item)}</li>`).join('')
      html.push(`<ul class="md-list">${listHtml}</ul>`)
      continue
    }

    // 有序列表 1.
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [line.replace(/^\d+\.\s+/, '')]
      i++
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\d+\.\s+/, ''))
        i++
      }
      const listHtml = items.map(item => `<li>${esc(item)}</li>`).join('')
      html.push(`<ol class="md-list">${listHtml}</ol>`)
      continue
    }

    // 空行
    if (line.trim() === '') {
      i++
      continue
    }

    // 类 XML 标签块（如 <type> ... </type>）—— 标签行高亮，内部内容 Markdown 渲染
    if (line.trimStart().startsWith('<') && /^<\w+/.test(line.trimStart())) {
      const xmlLines: string[] = [line]
      const tagName = line.trimStart().match(/^<(\w+)/)?.[1]
      i++
      while (i < lines.length) {
        const next = lines[i]!
        if (tagName && new RegExp(`^\\s*</${tagName}>\\s*$`).test(next)) {
          xmlLines.push(next)
          i++
          break
        }
        xmlLines.push(next)
        i++
      }
      while (i < lines.length && lines[i]!.trim() === '') {
        i++
      }

      // 标签行高亮
      const openTag = renderXmlHighlight(xmlLines[0]!)
      const closeTag = renderXmlHighlight(xmlLines[xmlLines.length - 1]!)

      // 内部内容：去掉标签行，按 Markdown 渲染
      const bodyLines = xmlLines.slice(1, -1)
      const bodyText = bodyLines.map(l => l.replace(/^\s+/, '')).join('\n').trim()
      const bodyHtml = bodyText ? renderMarkdownContent(bodyText) : ''

      html.push(`<div class="md-xml-inline">
        <div class="xml-tag-line">${openTag}</div>
        ${bodyHtml ? `<div class="xml-body-content">${bodyHtml}</div>` : ''}
        <div class="xml-tag-line">${closeTag}</div>
      </div>`)
      continue
    }

    // 普通段落（收集连续的非空行）
    const paraLines: string[] = [line]
    i++
    while (i < lines.length && lines[i]!.trim() !== '' && !lines[i]!.startsWith('```') && !/^#{1,6}\s/.test(lines[i]!)) {
      paraLines.push(lines[i]!)
      i++
    }
    const paraText = paraLines.join(' ')
    html.push(`<p class="md-paragraph">${renderInlineMarkdown(esc(paraText))}</p>`)
  }

  return html.join('\n')
}

/**
 * 渲染行内 Markdown（粗体、行内代码、链接）
 */
function renderInlineMarkdown(text: string): string {
  // 行内代码 `code`
  text = text.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
  // 粗体 **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // 链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>')
  return text
}

/**
 * 对类 XML 标签内容进行语法高亮
 * 标签名、属性名、属性值分别用不同颜色
 */
function renderXmlHighlight(text: string): string {
  // 先对整个文本统一转义
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trimStart()
    const indent = line.slice(0, line.length - trimmed.length)

    // 匹配所有标签（包括闭合标签）并高亮
    let processed = trimmed
      .replace(
        /(&lt;)(\/?)(\w[\w-]*)((?:\s+(?:[\w-]+(?:=(?:"[^"]*"|'[^']*'|[\w-]+))?))*)\s*(\/?)(&gt;)/g,
        (_match, lt, slash, tagName, attrs, selfClose, gt) => {
          const attrsHighlighted = attrs
            .replace(/ ([\w-]+)(=)/g, ' <span class="xml-attr">$1</span>$2')
            .replace(/="([^"]*)"/g, '=<span class="xml-val">"$1"</span>')
            .replace(/='([^']*)'/g, "=<span class='xml-val'>'$1'</span>")
          return `${lt}<span class="xml-tag">${slash}${tagName}</span>${attrsHighlighted}${selfClose}${gt}`
        }
      )

    // 处理 user:/assistant: 前缀（行首，在示例代码中）
    processed = processed
      .replace(/^(user|assistant):/gmi, '<span class="xml-role-example">$1</span>:')

    // 处理 [saved xxx] 标记
    processed = processed
      .replace(/\[(saved|saves|save)[^\]]*\]/gi, '<span class="xml-note">$&</span>')

    // 处理 <type> 块中的特殊字段名 (name, description, when_to_save, how_to_use, examples)
    processed = processed
      .replace(/\b(name|description|when_to_save|how_to_use|body_structure|type)\b(?=\s*:)/gi, '<span class="xml-field">$1</span>')

    // 处理 --- 分隔符
    processed = processed
      .replace(/^---+$/gm, '<span class="xml-separator">$&</span>')

    result.push(indent + processed)
  }

  return result.join('\n')
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
        <span class="section-badges">
          <span class="section-badge">${messages.length} messages</span>
        </span>
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
    <tr class="tool-row">
      <td class="tool-name-cell"><code>${esc(tool.name)}</code></td>
      <td class="tool-desc-cell">${tool.description ? esc(tool.description) : '<span class="tool-no-desc">—</span>'}</td>
    </tr>
  `).join('')

  return `
    <div class="detail-section">
      <div class="detail-section-header">
        <span class="section-title">Tools</span>
        <span class="section-badges">
          <span class="section-badge">${tools.length} tools</span>
        </span>
      </div>
      <div class="detail-section-content">
        <table class="tools-table">
          ${toolHtml}
        </table>
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
      <div class="detail-section">
        <div class="detail-section-header">
          <span class="section-title">Thinking</span>
          <span class="section-badges">
            <span class="section-badge">${thinkingText.length.toLocaleString()} chars</span>
          </span>
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
          <span class="section-badges">
            <span class="section-badge">${text.length.toLocaleString()} chars</span>
          </span>
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
          <span class="tool-use-icon">⚙</span>
          <span class="tool-use-name">${esc(tool.name ?? '')}</span>
          <span class="tool-use-id">${esc(tool.id ?? '')}</span>
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
          <span class="section-badges">
            <span class="section-badge">${toolUseBlocks.length} calls</span>
          </span>
        </div>
        <div class="detail-section-content">
          <div class="tool-uses-list">
            ${toolHtml}
          </div>
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

  const items: Array<{ label: string; value: number }> = [
    { label: 'Input', value: usage.input_tokens },
    { label: 'Output', value: usage.output_tokens },
  ]
  if (usage.cache_creation_input_tokens) { items.push({ label: 'Cache Write', value: usage.cache_creation_input_tokens }) }
  if (usage.cache_read_input_tokens) { items.push({ label: 'Cache Read', value: usage.cache_read_input_tokens }) }

  const total = items.reduce((s, i) => s + i.value, 0)

  const usageHtml = items.map(item => {
    const pct = total > 0 ? (item.value / total * 100) : 0
    return `
      <div class="usage-item">
        <div class="usage-item-header">
          <span class="usage-label">${item.label}</span>
          <span class="usage-value">${fmtNumber(item.value)}</span>
        </div>
        <div class="usage-bar">
          <div class="usage-bar-fill" style="width: ${pct.toFixed(1)}%"></div>
        </div>
      </div>
    `
  }).join('')

  return `
    <div class="detail-section">
      <div class="detail-section-header">
        <span class="section-title">Token Usage</span>
        <span class="section-badges">
          <span class="section-badge">${fmtNumber(total)} total</span>
        </span>
      </div>
      <div class="detail-section-content">
        <div class="usage-list">
          ${usageHtml}
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
