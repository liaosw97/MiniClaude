/**
 * Trace 视图 — 原始 trace 数据展示
 *
 * 支持 JSON/YAML/Pretty 三种格式显示原始 trace 数据。
 */

import type { TraceEntry } from '../../shared/types'
import { esc } from '../../shared/dom'
import { renderJSONTree } from './json-tree'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 显示格式 */
export type TraceFormat = 'json' | 'yaml' | 'pretty'

/** Trace 视图状态 */
interface TraceViewState {
  entry: TraceEntry | null
  format: TraceFormat
}

// ─── 状态管理 ─────────────────────────────────────────────────────────────────

const state: TraceViewState = {
  entry: null,
  format: 'json',
}

// ─── 格式化函数 ───────────────────────────────────────────────────────────────

/**
 * 格式化为 JSON 字符串
 */
function formatJson(data: any): string {
  return JSON.stringify(data, null, 2)
}

/**
 * 格式化为 YAML 字符串（简单实现）
 */
function formatYaml(data: any, indent: number = 0): string {
  const prefix = '  '.repeat(indent)

  if (data === null || data === undefined) {
    return `${prefix}null`
  }

  if (typeof data === 'string') {
    if (data.includes('\n')) {
      return `${prefix}|\n${data.split('\n').map((line: string) => `${prefix}  ${line}`).join('\n')}`
    }
    if (data.includes(':') || data.includes('#') || data.includes('"') || data.includes("'")) {
      return `${prefix}"${data.replace(/"/g, '\\"')}"`
    }
    return `${prefix}${data}`
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return `${prefix}${data}`
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return `${prefix}[]`

    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        const content = formatYaml(item, indent + 1).trimStart()
        return `${prefix}- ${content}`
      }
      return `${prefix}- ${formatYaml(item, 0).trim()}`
    }).join('\n')
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return `${prefix}{}`

    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${prefix}${key}:\n${formatYaml(value, indent + 1)}`
      }
      return `${prefix}${key}: ${formatYaml(value, 0).trim()}`
    }).join('\n')
  }

  return `${prefix}${String(data)}`
}

/**
 * 格式化为 Pretty 格式（JSON 树）
 */
function formatPretty(data: any): string {
  return renderJSONTree(data, { initialDepth: 3 })
}

// ─── 渲染函数 ─────────────────────────────────────────────────────────────────

/**
 * 渲染格式选择器
 */
function renderFormatSelector(): string {
  const formats: TraceFormat[] = ['json', 'yaml', 'pretty']

  const buttons = formats.map(format => `
    <button class="format-btn ${format === state.format ? 'active' : ''}"
            data-format="${format}">
      ${format.toUpperCase()}
    </button>
  `).join('')

  return `
    <div class="trace-format-selector">
      ${buttons}
    </div>
  `
}

/**
 * 渲染 trace 内容
 */
function renderTraceContent(entry: TraceEntry): string {
  let content: string

  switch (state.format) {
    case 'json':
      content = `<pre class="trace-content json">${esc(formatJson(entry))}</pre>`
      break
    case 'yaml':
      content = `<pre class="trace-content yaml">${esc(formatYaml(entry))}</pre>`
      break
    case 'pretty':
      content = `<div class="trace-content pretty">${formatPretty(entry)}</div>`
      break
    default:
      content = `<pre class="trace-content json">${esc(formatJson(entry))}</pre>`
  }

  return content
}

/**
 * 渲染完整 Trace 视图
 */
export function renderTraceDetail(entry: TraceEntry | null): void {
  const container = document.getElementById('trace-view')
  if (!container) return

  if (!entry) {
    container.innerHTML = `
      <div class="trace-view-empty">
        <p>Select a trace entry to view raw data</p>
      </div>
    `
    return
  }

  state.entry = entry

  container.innerHTML = `
    <div class="trace-view">
      ${renderFormatSelector()}
      <div class="trace-view-content">
        ${renderTraceContent(entry)}
      </div>
    </div>
  `

  // 初始化格式切换
  initFormatSwitcher(container)

  // 初始化 JSON 树交互（如果是 pretty 格式）
  if (state.format === 'pretty') {
    const content = container.querySelector('.trace-view-content')
    if (content) {
      initJsonTreeInteraction(content as HTMLElement)
    }
  }
}

/**
 * 初始化格式切换器
 */
function initFormatSwitcher(container: HTMLElement): void {
  const buttons = container.querySelectorAll('.format-btn')

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const format = (btn as HTMLElement).dataset.format as TraceFormat
      if (format) {
        state.format = format
        renderTraceDetail(state.entry)
      }
    })
  })
}

// ─── 公开 API ─────────────────────────────────────────────────────────────────

/**
 * 初始化 Trace 视图
 */
export function initTraceView(): void {
  state.entry = null
  state.format = 'json'
}

/**
 * 更新 Trace 视图
 */
export function updateTraceView(entry: TraceEntry): void {
  renderTraceDetail(entry)
}

/**
 * 获取当前格式
 */
export function getTraceFormat(): TraceFormat {
  return state.format
}

/**
 * 设置格式
 */
export function setTraceFormat(format: TraceFormat): void {
  state.format = format
  if (state.entry) {
    renderTraceDetail(state.entry)
  }
}

/**
 * 清空 Trace 视图
 */
export function clearTraceView(): void {
  state.entry = null
  const container = document.getElementById('trace-view')
  if (container) {
    container.innerHTML = ''
  }
}
