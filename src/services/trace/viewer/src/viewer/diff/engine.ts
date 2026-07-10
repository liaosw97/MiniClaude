/**
 * Diff 比对引擎 — 结构化差异比较
 *
 * 支持对象、数组、字符串的深度比较，
 * 输出结构化的差异结果。
 */

import type { DiffResult } from '../../shared/types'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** Diff 选项 */
export interface DiffOptions {
  /** 忽略的字段路径 */
  ignorePaths?: string[]
  /** 深度限制 */
  maxDepth?: number
  /** 字符串差异算法 */
  stringDiffMode?: 'line' | 'word' | 'char'
}

/** 行差异结果 */
export interface LineDiffResult {
  type: 'added' | 'removed' | 'unchanged'
  line: string
  lineNumber?: number
  oldLineNumber?: number
  newLineNumber?: number
}

// ─── 默认选项 ─────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: DiffOptions = {
  ignorePaths: [],
  maxDepth: 10,
  stringDiffMode: 'line',
}

// ─── 结构化 Diff ──────────────────────────────────────────────────────────────

/**
 * 比较两个值，返回差异结果
 */
export function structuralDiff(
  oldValue: any,
  newValue: any,
  path: string = '$',
  options: Partial<DiffOptions> = {},
  depth: number = 0
): DiffResult | null {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // 检查深度限制
  if (depth > opts.maxDepth!) {
    return null
  }

  // 检查是否忽略此路径
  if (opts.ignorePaths?.some(p => path.startsWith(p))) {
    return null
  }

  // 相同值
  if (oldValue === newValue) {
    return {
      type: 'unchanged',
      path,
      oldValue,
      newValue,
    }
  }

  // null/undefined 处理
  if (oldValue === null || oldValue === undefined || newValue === null || newValue === undefined) {
    return {
      type: 'changed',
      path,
      oldValue,
      newValue,
    }
  }

  // 类型不同
  if (typeof oldValue !== typeof newValue) {
    return {
      type: 'changed',
      path,
      oldValue,
      newValue,
    }
  }

  // 数组比较
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    return diffArrays(oldValue, newValue, path, opts, depth)
  }

  // 对象比较
  if (typeof oldValue === 'object' && typeof newValue === 'object') {
    return diffObjects(oldValue, newValue, path, opts, depth)
  }

  // 基本类型比较
  if (oldValue !== newValue) {
    return {
      type: 'changed',
      path,
      oldValue,
      newValue,
    }
  }

  return null
}

/**
 * 比较两个对象
 */
function diffObjects(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  path: string,
  options: DiffOptions,
  depth: number
): DiffResult | null {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
  const children: DiffResult[] = []

  for (const key of allKeys) {
    const childPath = `${path}.${key}`
    const oldVal = oldObj[key]
    const newVal = newObj[key]

    if (!(key in oldObj)) {
      // 新增字段
      children.push({
        type: 'added',
        path: childPath,
        newValue: newVal,
      })
    } else if (!(key in newObj)) {
      // 删除字段
      children.push({
        type: 'removed',
        path: childPath,
        oldValue: oldVal,
      })
    } else {
      // 比较字段
      const childDiff = structuralDiff(oldVal, newVal, childPath, options, depth + 1)
      if (childDiff && childDiff.type !== 'unchanged') {
        children.push(childDiff)
      }
    }
  }

  if (children.length === 0) {
    return null
  }

  return {
    type: 'changed',
    path,
    oldValue: oldObj,
    newValue: newObj,
    children,
  }
}

/**
 * 比较两个数组
 */
function diffArrays(
  oldArr: any[],
  newArr: any[],
  path: string,
  options: DiffOptions,
  depth: number
): DiffResult | null {
  const maxLen = Math.max(oldArr.length, newArr.length)
  const children: DiffResult[] = []

  for (let i = 0; i < maxLen; i++) {
    const childPath = `${path}[${i}]`

    if (i >= oldArr.length) {
      // 新增元素
      children.push({
        type: 'added',
        path: childPath,
        newValue: newArr[i],
      })
    } else if (i >= newArr.length) {
      // 删除元素
      children.push({
        type: 'removed',
        path: childPath,
        oldValue: oldArr[i],
      })
    } else {
      // 比较元素
      const childDiff = structuralDiff(oldArr[i], newArr[i], childPath, options, depth + 1)
      if (childDiff && childDiff.type !== 'unchanged') {
        children.push(childDiff)
      }
    }
  }

  if (children.length === 0) {
    return null
  }

  return {
    type: 'changed',
    path,
    oldValue: oldArr,
    newValue: newArr,
    children,
  }
}

// ─── 行级 Diff ────────────────────────────────────────────────────────────────

/**
 * 比较两个字符串的行差异
 */
export function lineDiff(oldText: string, newText: string): LineDiffResult[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const results: LineDiffResult[] = []

  // 简单的 LCS 算法
  const lcs = computeLCS(oldLines, newLines)

  let oldIndex = 0
  let newIndex = 0
  let lcsIndex = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length) {
      // 输出删除的行
      while (oldIndex < lcs[lcsIndex].oldIndex) {
        results.push({
          type: 'removed',
          line: oldLines[oldIndex],
          oldLineNumber: oldIndex + 1,
        })
        oldIndex++
      }

      // 输出新增的行
      while (newIndex < lcs[lcsIndex].newIndex) {
        results.push({
          type: 'added',
          line: newLines[newIndex],
          newLineNumber: newIndex + 1,
        })
        newIndex++
      }

      // 输出相同的行
      results.push({
        type: 'unchanged',
        line: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
      })
      oldIndex++
      newIndex++
      lcsIndex++
    } else {
      // 处理剩余的行
      if (oldIndex < oldLines.length) {
        results.push({
          type: 'removed',
          line: oldLines[oldIndex],
          oldLineNumber: oldIndex + 1,
        })
        oldIndex++
      }
      if (newIndex < newLines.length) {
        results.push({
          type: 'added',
          line: newLines[newIndex],
          newLineNumber: newIndex + 1,
        })
        newIndex++
      }
    }
  }

  return results
}

/**
 * 计算最长公共子序列（LCS）
 */
function computeLCS(
  oldLines: string[],
  newLines: string[]
): Array<{ oldIndex: number; newIndex: number }> {
  const m = oldLines.length
  const n = newLines.length

  // 创建 DP 表
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  // 填充 DP 表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // 回溯找到 LCS
  const lcs: Array<{ oldIndex: number; newIndex: number }> = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      lcs.unshift({ oldIndex: i - 1, newIndex: j - 1 })
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return lcs
}

// ─── Trace 特定 Diff ──────────────────────────────────────────────────────────

/**
 * 比较两个 TraceEntry 的 messages
 */
export function diffMessages(oldEntry: any, newEntry: any): DiffResult | null {
  const oldMessages = oldEntry?.request?.body?.messages ?? []
  const newMessages = newEntry?.request?.body?.messages ?? []

  return structuralDiff(oldMessages, newMessages, '$.request.body.messages')
}

/**
 * 比较两个 TraceEntry 的 system prompt
 */
export function diffSystemPrompt(oldEntry: any, newEntry: any): DiffResult | null {
  const oldSystem = oldEntry?.request?.body?.system ?? ''
  const newSystem = newEntry?.request?.body?.system ?? ''

  return structuralDiff(oldSystem, newSystem, '$.request.body.system')
}

/**
 * 比较两个 TraceEntry 的 tools
 */
export function diffTools(oldEntry: any, newEntry: any): DiffResult | null {
  const oldTools = oldEntry?.request?.body?.tools ?? []
  const newTools = newEntry?.request?.body?.tools ?? []

  return structuralDiff(oldTools, newTools, '$.request.body.tools')
}

/**
 * 比较两个 TraceEntry 的完整请求
 */
export function diffRequest(oldEntry: any, newEntry: any): DiffResult | null {
  const oldRequest = oldEntry?.request?.body ?? {}
  const newRequest = newEntry?.request?.body ?? {}

  return structuralDiff(oldRequest, newRequest, '$.request.body', {
    ignorePaths: ['$.request.body.model'],
  })
}
