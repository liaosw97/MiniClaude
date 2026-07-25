// tests/services/trace/diff-performance.test.ts
import { describe, it, expect } from 'vitest'
import { computeDiff } from '../../../src/services/trace/diff.js'

describe('diff performance', () => {
  it('should complete within 100ms for 1000-line input', () => {
    const linesA = Array.from({ length: 1000 }, (_, i) => `line ${i}: some content here\n`)
    const linesB = linesA.map((l, i) => {
      if (i === 0) return `line ${i}: MODIFIED first line\n`
      if (i === 500) return `line ${i}: MODIFIED middle line\n`
      if (i === 999) return `line ${i}: MODIFIED last line\n`
      return l
    })
    const before = linesA.join('')
    const after = linesB.join('')

    const start = performance.now()
    const result = computeDiff(before, after)
    const elapsed = performance.now() - start
    // 宽松阈值确保 CI 稳定性，实际开发环境通常 <20ms
    expect(elapsed).toBeLessThan(100)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle completely different 1000-line inputs', () => {
    const before = Array.from({ length: 1000 }, (_, i) => `old line ${i}\n`).join('')
    const after = Array.from({ length: 1000 }, (_, i) => `new line ${i}\n`).join('')

    const start = performance.now()
    const result = computeDiff(before, after)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should short-circuit on identical inputs', () => {
    const text = Array.from({ length: 1000 }, (_, i) => `line ${i}\n`).join('')
    const start = performance.now()
    const result = computeDiff(text, text)
    const elapsed = performance.now() - start
    // 相同文本走 === 短路分支，应极快（通常 <1ms）
    expect(elapsed).toBeLessThan(10)
    expect(result).toEqual([{ op: 'equal', value: text }])
  })
})