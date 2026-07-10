/**
 * Diff 渲染器 — 将差异结果渲染为 HTML
 *
 * 支持结构化 diff 和行级 diff 的可视化展示。
 */

import type { DiffResult } from '../../shared/types'
import type { LineDiffResult } from './engine'
import { esc } from '../../shared/dom'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** Diff 显示模式 */
export type DiffViewMode = 'unified' | 'split'

/** Diff 渲染配置 */
export interface DiffRenderConfig {
  /** 显示模式 */
  mode: DiffViewMode
  /** 显示行号 */
  showLineNumbers: boolean
  /** 上下文行数 */
  contextLines: number
}

// ─── 默认配置 ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DiffRenderConfig = {
  mode: 'unified',
  showLineNumbers: true,
  contextLines: 3,
}

// ─── 结构化 Diff 渲染 ────────────────────────────────────────────────────────

/**
 * 渲染结构化差异结果
 */
function renderStructuralDiffNode(
  diff: DiffResult,
  depth: number = 0
): string {
  const indent = '  '.repeat(depth)
  const pathParts = diff.path.split('.')
  const lastPart = pathParts[pathParts.length - 1] ?? diff.path

  switch (diff.type) {
    case 'added':
      return `
        <div class="diff-node diff-added" style="margin-left: ${depth * 20}px">
          <span class="diff-indicator">+</span>
          <span class="diff-key">${esc(lastPart)}</span>:
          <span class="diff-value">${esc(JSON.stringify(diff.newValue))}</span>
        </div>
      `

    case 'removed':
      return `
        <div class="diff-node diff-removed" style="margin-left: ${depth * 20}px">
          <span class="diff-indicator">-</span>
          <span class="diff-key">${esc(lastPart)}</span>:
          <span class="diff-value">${esc(JSON.stringify(diff.oldValue))}</span>
        </div>
      `

    case 'changed':
      if (diff.children && diff.children.length > 0) {
        const childrenHtml = diff.children
          .map(child => renderStructuralDiffNode(child, depth + 1))
          .join('')

        return `
          <div class="diff-node diff-changed" style="margin-left: ${depth * 20}px">
            <div class="diff-node-header">
              <span class="diff-indicator">~</span>
              <span class="diff-key">${esc(lastPart)}</span>
            </div>
            <div class="diff-children">
              ${childrenHtml}
            </div>
          </div>
        `
      }

      return `
        <div class="diff-node diff-changed" style="margin-left: ${depth * 20}px">
          <span class="diff-indicator">~</span>
          <span class="diff-key">${esc(lastPart)}</span>:
          <span class="diff-old">${esc(JSON.stringify(diff.oldValue))}</span>
          <span class="diff-arrow">→</span>
          <span class="diff-new">${esc(JSON.stringify(diff.newValue))}</span>
        </div>
      `

    case 'unchanged':
      return `
        <div class="diff-node diff-unchanged" style="margin-left: ${depth * 20}px">
          <span class="diff-indicator"> </span>
          <span class="diff-key">${esc(lastPart)}</span>:
          <span class="diff-value">${esc(JSON.stringify(diff.oldValue))}</span>
        </div>
      `

    default:
      return ''
  }
}

/**
 * 渲染结构化差异的完整视图
 */
export function renderStructuralDiff(
  diff: DiffResult | null,
  config: Partial<DiffRenderConfig> = {}
): string {
  if (!diff) {
    return '<div class="diff-empty">No differences</div>'
  }

  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  return `
    <div class="diff-view structural">
      <div class="diff-header">
        <span class="diff-path">${esc(diff.path)}</span>
        <span class="diff-type">${esc(diff.type)}</span>
      </div>
      <div class="diff-content">
        ${renderStructuralDiffNode(diff)}
      </div>
    </div>
  `
}

// ─── 行级 Diff 渲染 ──────────────────────────────────────────────────────────

/**
 * 渲染单行差异（统一模式）
 */
function renderUnifiedLine(
  result: LineDiffResult,
  showLineNumbers: boolean
): string {
  const lineClass = `diff-line diff-${result.type}`

  let lineNumbers = ''
  if (showLineNumbers) {
    const oldNum = result.oldLineNumber ?? ''
    const newNum = result.newLineNumber ?? ''
    lineNumbers = `
      <span class="diff-line-num old">${oldNum}</span>
      <span class="diff-line-num new">${newNum}</span>
    `
  }

  const indicator = result.type === 'added' ? '+' : result.type === 'removed' ? '-' : ' '

  return `
    <div class="${lineClass}">
      ${lineNumbers}
      <span class="diff-indicator">${indicator}</span>
      <span class="diff-line-content">${esc(result.line)}</span>
    </div>
  `
}

/**
 * 渲染行差异（分割模式）
 */
function renderSplitLine(
  oldResult: LineDiffResult | null,
  newResult: LineDiffResult | null,
  showLineNumbers: boolean
): string {
  const oldClass = oldResult ? `diff-${oldResult.type}` : 'diff-empty'
  const newClass = newResult ? `diff-${newResult.type}` : 'diff-empty'

  const oldNum = oldResult?.oldLineNumber ?? ''
  const newNum = newResult?.newLineNumber ?? ''

  const oldContent = oldResult?.line ?? ''
  const newContent = newResult?.line ?? ''

  return `
    <div class="diff-line-split">
      <div class="diff-line ${oldClass}">
        ${showLineNumbers ? `<span class="diff-line-num">${oldNum}</span>` : ''}
        <span class="diff-indicator">${oldResult?.type === 'removed' ? '-' : ' '}</span>
        <span class="diff-line-content">${esc(oldContent)}</span>
      </div>
      <div class="diff-line ${newClass}">
        ${showLineNumbers ? `<span class="diff-line-num">${newNum}</span>` : ''}
        <span class="diff-indicator">${newResult?.type === 'added' ? '+' : ' '}</span>
        <span class="diff-line-content">${esc(newContent)}</span>
      </div>
    </div>
  `
}

/**
 * 渲染行级差异（统一模式）
 */
export function renderUnifiedDiff(
  results: LineDiffResult[],
  config: Partial<DiffRenderConfig> = {}
): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  const linesHtml = results
    .map(result => renderUnifiedLine(result, fullConfig.showLineNumbers))
    .join('')

  return `
    <div class="diff-view unified">
      <div class="diff-content">
        ${linesHtml}
      </div>
    </div>
  `
}

/**
 * 渲染行级差异（分割模式）
 */
export function renderSplitDiff(
  results: LineDiffResult[],
  config: Partial<DiffRenderConfig> = {}
): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  // 将结果分为旧行和新行
  const oldLines: LineDiffResult[] = []
  const newLines: LineDiffResult[] = []

  for (const result of results) {
    if (result.type === 'removed') {
      oldLines.push(result)
    } else if (result.type === 'added') {
      newLines.push(result)
    } else {
      oldLines.push(result)
      newLines.push(result)
    }
  }

  const maxLen = Math.max(oldLines.length, newLines.length)
  const linesHtml: string[] = []

  for (let i = 0; i < maxLen; i++) {
    linesHtml.push(renderSplitLine(
      oldLines[i] ?? null,
      newLines[i] ?? null,
      fullConfig.showLineNumbers
    ))
  }

  return `
    <div class="diff-view split">
      <div class="diff-content">
        ${linesHtml.join('')}
      </div>
    </div>
  `
}

/**
 * 渲染行级差异（根据配置选择模式）
 */
export function renderLineDiff(
  results: LineDiffResult[],
  config: Partial<DiffRenderConfig> = {}
): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  if (fullConfig.mode === 'split') {
    return renderSplitDiff(results, config)
  }

  return renderUnifiedDiff(results, config)
}

// ─── Diff 统计 ────────────────────────────────────────────────────────────────

/**
 * 计算差异统计
 */
export function computeDiffStats(results: LineDiffResult[]): {
  added: number
  removed: number
  unchanged: number
} {
  let added = 0
  let removed = 0
  let unchanged = 0

  for (const result of results) {
    switch (result.type) {
      case 'added':
        added++
        break
      case 'removed':
        removed++
        break
      case 'unchanged':
        unchanged++
        break
    }
  }

  return { added, removed, unchanged }
}

/**
 * 渲染差异统计
 */
export function renderDiffStats(results: LineDiffResult[]): string {
  const stats = computeDiffStats(results)

  return `
    <div class="diff-stats">
      <span class="stat-added">+${stats.added}</span>
      <span class="stat-removed">-${stats.removed}</span>
      <span class="stat-unchanged">${stats.unchanged} unchanged</span>
    </div>
  `
}
