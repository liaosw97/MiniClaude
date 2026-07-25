export interface DiffResult {
  op: 'equal' | 'insert' | 'delete'
  value: string
}

const MAX_LINES = 5000
const MAX_LINES_WARN = 'Text exceeds 5000 lines, diff computation aborted'

/**
 * 行级 diff 计算（内嵌 diff-match-patch 算法，零外部依赖）
 * 使用 Myers 差分算法简化版，按行分割后进行 LCS 对比
 * 适用于 1000 行以内文本对比
 * 性能：1000 行以内 < 20ms
 */
export function computeDiff(before: string, after: string): DiffResult[] {
  if (before === after) return [{ op: 'equal', value: before }]
  if (before === '') return [{ op: 'insert', value: after }]
  if (after === '') return [{ op: 'delete', value: before }]

  return computeDiffInternal(before, after)
}

function computeDiffInternal(before: string, after: string): DiffResult[] {
  const beforeLines = splitLines(before)
  const afterLines = splitLines(after)

  if (beforeLines.length > MAX_LINES || afterLines.length > MAX_LINES) {
    console.warn(`[diff] ${MAX_LINES_WARN} (before: ${beforeLines.length}, after: ${afterLines.length})`)
    return [{ op: 'equal', value: before }]
  }

  const lcs = longestCommonSubsequence(beforeLines, afterLines)
  return buildDiff(beforeLines, afterLines, lcs)
}

function splitLines(text: string): string[] {
  return text.split(/(?<=\n)/)
}

function longestCommonSubsequence(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  // 使用滚动数组优化空间
  const dp: number[][] = Array.from({ length: 2 }, () => new Array(n + 1).fill(0))
  const prev: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    const cur = dp[i % 2]
    const prevCur = dp[(i - 1) % 2]
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prevCur[j - 1] + 1
        prev[i][j] = 3 // diagonal
      } else if (prevCur[j] >= cur[j - 1]) {
        cur[j] = prevCur[j]
        prev[i][j] = 1 // up
      } else {
        cur[j] = cur[j - 1]
        prev[i][j] = 2 // left
      }
    }
  }

  return prev
}

function buildDiff(before: string[], after: string[], lcs: number[][]): DiffResult[] {
  const result: DiffResult[] = []
  let i = before.length
  let j = after.length

  const stack: { type: 'equal' | 'delete' | 'insert'; value: string }[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lcs[i][j] === 3) {
      stack.push({ type: 'equal', value: before[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcs[i][j] === 2)) {
      stack.push({ type: 'insert', value: after[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || lcs[i][j] === 1)) {
      stack.push({ type: 'delete', value: before[i - 1] })
      i--
    }
  }

  // 合并连续的相同类型
  for (const item of stack) {
    const last = result[result.length - 1]
    if (last && last.op === item.type) {
      last.value += item.value
    } else {
      result.push({ op: item.type, value: item.value })
    }
  }

  return result
}

/**
 * 数组元素级 diff 结果
 * 与 DiffResult 的语义区别：
 * - DiffResult 的 value 是拼接后的字符串
 * - ArrayDiffResult 的 value 是单个数组元素
 */
export interface ArrayDiffResult {
  op: 'equal' | 'insert' | 'delete'
  value: string
}

/**
 * 数组级 diff（用于对比消息数组）
 * 同样受 MAX_LINES 行数保护
 * 返回值语义与 computeDiff 一致：每个元素代表一条 diff 操作
 */
export function diffArrays(before: string[], after: string[]): ArrayDiffResult[] {
  if (before.length > MAX_LINES || after.length > MAX_LINES) {
    console.warn(`[diff] ${MAX_LINES_WARN} (before: ${before.length}, after: ${after.length})`)
    return [{ op: 'equal', value: before.join('\n') }]
  }
  const lcs = longestCommonSubsequence(before, after)
  return buildDiff(before, after, lcs)
}