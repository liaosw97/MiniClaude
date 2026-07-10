/**
 * 内容渲染器 — 渲染 messages 和 content blocks
 *
 * 将 API 的 messages 数组和 content blocks 渲染为可读的 HTML。
 */

import type { Message, ContentBlock } from '../../shared/types'
import { esc } from '../../shared/dom'
import { extractText, extractToolUses, extractToolResults, extractThinking } from '../data/normalize'

// ─── 渲染单个内容块 ──────────────────────────────────────────────────────────

/**
 * 渲染文本块
 */
function renderTextBlock(block: ContentBlock): string {
  if (!block.text) return ''
  return `<div class="content-text">${esc(block.text)}</div>`
}

/**
 * 渲染 thinking 块
 */
function renderThinkingBlock(block: ContentBlock): string {
  if (!block.thinking) return ''
  return `
    <div class="content-thinking">
      <div class="thinking-header">Thinking</div>
      <pre class="thinking-content">${esc(block.thinking)}</pre>
    </div>
  `
}

/**
 * 渲染工具调用块
 */
function renderToolUseBlock(block: ContentBlock): string {
  return `
    <div class="content-tool-use">
      <div class="tool-use-header">
        <span class="tool-use-icon">&#9881;</span>
        <span class="tool-use-name">${esc(block.name ?? 'unknown')}</span>
        <span class="tool-use-id">${esc(block.id ?? '')}</span>
      </div>
      <div class="tool-use-input">
        <pre class="code-block">${esc(JSON.stringify(block.input, null, 2))}</pre>
      </div>
    </div>
  `
}

/**
 * 渲染工具结果块
 */
function renderToolResultBlock(block: ContentBlock): string {
  const content = typeof block.content === 'string'
    ? block.content
    : Array.isArray(block.content)
      ? extractText(block.content)
      : ''

  return `
    <div class="content-tool-result">
      <div class="tool-result-header">
        <span class="tool-result-icon">&#10003;</span>
        <span class="tool-result-id">${esc(block.tool_use_id ?? '')}</span>
      </div>
      <div class="tool-result-content">
        <pre class="code-block">${esc(content)}</pre>
      </div>
    </div>
  `
}

/**
 * 渲染图片块
 */
function renderImageBlock(block: ContentBlock): string {
  if (!block.source) return ''
  return `
    <div class="content-image">
      <img src="data:${block.source.media_type};base64,${block.source.data}"
           alt="Image" class="content-image-img" />
    </div>
  `
}

/**
 * 渲染单个内容块（通用）
 */
export function renderContentBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'text':
      return renderTextBlock(block)
    case 'thinking':
      return renderThinkingBlock(block)
    case 'tool_use':
      return renderToolUseBlock(block)
    case 'tool_result':
      return renderToolResultBlock(block)
    case 'image':
      return renderImageBlock(block)
    default:
      return `<div class="content-unknown">Unknown block type: ${esc(block.type)}</div>`
  }
}

/**
 * 渲染内容块数组
 */
export function renderContentBlocks(blocks: ContentBlock[]): string {
  return blocks.map(renderContentBlock).join('')
}

// ─── 渲染消息 ─────────────────────────────────────────────────────────────────

/**
 * 渲染单条消息
 */
function renderMessage(message: Message, index: number): string {
  const role = message.role
  const roleClass = role === 'user' ? 'user' : role === 'assistant' ? 'assistant' : 'system'

  let contentHtml = ''

  if (typeof message.content === 'string') {
    contentHtml = `<div class="message-text">${esc(message.content)}</div>`
  } else if (Array.isArray(message.content)) {
    contentHtml = renderContentBlocks(message.content)
  }

  return `
    <div class="message ${roleClass}">
      <div class="message-header">
        <span class="message-role">${esc(role)}</span>
        <span class="message-index">#${index + 1}</span>
      </div>
      <div class="message-content">
        ${contentHtml}
      </div>
    </div>
  `
}

/**
 * 渲染消息数组
 */
export function renderMessages(messages: Message[]): string {
  if (messages.length === 0) {
    return '<div class="messages-empty">No messages</div>'
  }

  return `
    <div class="messages-list">
      ${messages.map((msg, i) => renderMessage(msg, i)).join('')}
    </div>
  `
}

// ─── 渲染统计 ─────────────────────────────────────────────────────────────────

/**
 * 渲染内容统计信息
 */
export function renderContentStats(blocks: ContentBlock[]): string {
  const textBlocks = blocks.filter(b => b.type === 'text')
  const toolUseBlocks = extractToolUses(blocks)
  const toolResultBlocks = extractToolResults(blocks)
  const thinkingBlocks = blocks.filter(b => b.type === 'thinking')

  const totalChars = blocks.reduce((sum, b) => {
    if (b.text) return sum + b.text.length
    if (b.thinking) return sum + b.thinking.length
    return sum
  }, 0)

  return `
    <div class="content-stats">
      <span class="stat-item">${textBlocks.length} text blocks</span>
      <span class="stat-item">${thinkingBlocks.length} thinking blocks</span>
      <span class="stat-item">${toolUseBlocks.length} tool calls</span>
      <span class="stat-item">${toolResultBlocks.length} tool results</span>
      <span class="stat-item">${totalChars} chars</span>
    </div>
  `
}
