/**
 * JSON 树视图 — 可折叠的 JSON 数据展示
 *
 * 支持展开/收起 JSON 对象和数组节点，
 * 高亮显示不同类型的数据。
 */

import { esc } from '../../shared/dom'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** JSON 树节点类型 */
type JsonNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

/** JSON 树配置 */
export interface JsonTreeConfig {
  /** 初始展开深度 */
  initialDepth: number
  /** 最大展开深度 */
  maxDepth: number
  /** 显示值预览 */
  showPreview: boolean
}

// ─── 默认配置 ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: JsonTreeConfig = {
  initialDepth: 2,
  maxDepth: 10,
  showPreview: true,
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/**
 * 获取 JSON 值的类型
 */
function getType(value: any): JsonNodeType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value as JsonNodeType
}

/**
 * 获取值的预览文本
 */
function getPreview(value: any, type: JsonNodeType): string {
  switch (type) {
    case 'object': {
      const keys = Object.keys(value)
      if (keys.length === 0) return '{}'
      if (keys.length <= 3) return `{ ${keys.join(', ')} }`
      return `{ ${keys.slice(0, 3).join(', ')}, ... }`
    }
    case 'array':
      if (value.length === 0) return '[]'
      return `[${value.length} items]`
    case 'string':
      if (value.length > 50) return `"${value.slice(0, 50)}..."`
      return `"${value}"`
    case 'number':
    case 'boolean':
      return String(value)
    case 'null':
      return 'null'
    default:
      return String(value)
  }
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(str: string): string {
  return esc(str)
}

// ─── 渲染函数 ─────────────────────────────────────────────────────────────────

/**
 * 渲染 JSON 值（叶子节点）
 */
function renderValue(value: any, type: JsonNodeType): string {
  switch (type) {
    case 'string':
      return `<span class="json-string">"${escapeHtml(value)}"</span>`
    case 'number':
      return `<span class="json-number">${value}</span>`
    case 'boolean':
      return `<span class="json-boolean">${value}</span>`
    case 'null':
      return `<span class="json-null">null</span>`
    default:
      return `<span class="json-unknown">${escapeHtml(String(value))}</span>`
  }
}

/**
 * 渲染 JSON 对象或数组（递归）
 */
function renderNode(
  key: string | number | null,
  value: any,
  depth: number,
  config: JsonTreeConfig,
  path: string
): string {
  const type = getType(value)
  const isExpandable = type === 'object' || type === 'array'
  const isExpanded = depth < config.initialDepth

  if (!isExpandable) {
    // 叶子节点
    const keyHtml = key !== null
      ? `<span class="json-key">"${escapeHtml(String(key))}"</span>: `
      : ''

    return `
      <div class="json-node json-leaf" data-path="${escapeHtml(path)}">
        ${keyHtml}${renderValue(value, type)}
      </div>
    `
  }

  // 可展开节点
  const entries = type === 'object' ? Object.entries(value) : value.map((v: any, i: number) => [i, v])
  const preview = config.showPreview ? getPreview(value, type) : ''
  const bracketOpen = type === 'object' ? '{' : '['
  const bracketClose = type === 'object' ? '}' : ']'

  const keyHtml = key !== null
    ? `<span class="json-key">"${escapeHtml(String(key))}"</span>: `
    : ''

  const childrenHtml = entries.map(([k, v]: [string | number, any]) => {
    const childPath = type === 'object' ? `${path}.${k}` : `${path}[${k}]`
    return renderNode(k, v, depth + 1, config, childPath)
  }).join('')

  return `
    <div class="json-node json-expandable ${isExpanded ? 'expanded' : 'collapsed'}"
         data-path="${escapeHtml(path)}" data-depth="${depth}">
      <div class="json-node-header" onclick="this.parentElement.classList.toggle('expanded'); this.parentElement.classList.toggle('collapsed')">
        <span class="json-toggle">${isExpanded ? '▼' : '▶'}</span>
        ${keyHtml}
        <span class="json-bracket">${bracketOpen}</span>
        ${!isExpanded ? `<span class="json-preview">${escapeHtml(preview)}</span>` : ''}
        <span class="json-count">${entries.length} ${type === 'object' ? 'keys' : 'items'}</span>
      </div>
      <div class="json-children" style="display: ${isExpanded ? 'block' : 'none'}">
        ${childrenHtml}
      </div>
      <div class="json-bracket-close">${bracketClose}</div>
    </div>
  `
}

// ─── 公开 API ─────────────────────────────────────────────────────────────────

/**
 * 渲染 JSON 树
 */
export function renderJSONTree(
  data: any,
  config: Partial<JsonTreeConfig> = {}
): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  return renderNode(null, data, 0, fullConfig, '$')
}

/**
 * 初始化 JSON 树的交互
 */
export function initJsonTreeInteraction(container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('json-toggle') || target.classList.contains('json-node-header')) {
      const node = target.closest('.json-expandable') as HTMLElement
      if (node) {
        node.classList.toggle('expanded')
        node.classList.toggle('collapsed')

        const toggle = node.querySelector('.json-toggle')
        if (toggle) {
          toggle.textContent = node.classList.contains('expanded') ? '▼' : '▶'
        }

        const children = node.querySelector('.json-children') as HTMLElement
        if (children) {
          children.style.display = node.classList.contains('expanded') ? 'block' : 'none'
        }
      }
    }
  })
}

/**
 * 展开所有节点
 */
export function expandAll(container: HTMLElement): void {
  container.querySelectorAll('.json-expandable.collapsed').forEach(node => {
    node.classList.remove('collapsed')
    node.classList.add('expanded')

    const toggle = node.querySelector('.json-toggle')
    if (toggle) {
      toggle.textContent = '▼'
    }

    const children = node.querySelector('.json-children') as HTMLElement
    if (children) {
      children.style.display = 'block'
    }
  })
}

/**
 * 收起所有节点
 */
export function collapseAll(container: HTMLElement): void {
  container.querySelectorAll('.json-expandable.expanded').forEach(node => {
    node.classList.remove('expanded')
    node.classList.add('collapsed')

    const toggle = node.querySelector('.json-toggle')
    if (toggle) {
      toggle.textContent = '▶'
    }

    const children = node.querySelector('.json-children') as HTMLElement
    if (children) {
      children.style.display = 'none'
    }
  })
}
