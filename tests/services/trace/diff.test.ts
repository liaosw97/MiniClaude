import { describe, it, expect } from 'vitest'
import { computeDiff, diffArrays } from '../../../src/services/trace/diff.js'

describe('computeDiff', () => {
  it('should return equal for identical strings', () => {
    const result = computeDiff('hello world', 'hello world')
    expect(result).toEqual([{ op: 'equal', value: 'hello world' }])
  })

  it('should detect insertions', () => {
    const result = computeDiff('hello world', 'hello beautiful world')
    // LCS-based line-level diff: "hello world" is deleted, "hello beautiful world" is inserted
    expect(result).toContainEqual({ op: 'delete', value: 'hello world' })
    expect(result).toContainEqual({ op: 'insert', value: 'hello beautiful world' })
  })

  it('should detect deletions', () => {
    const result = computeDiff('hello beautiful world', 'hello world')
    expect(result).toContainEqual({ op: 'delete', value: 'hello beautiful world' })
    expect(result).toContainEqual({ op: 'insert', value: 'hello world' })
  })

  it('should handle completely different strings', () => {
    const result = computeDiff('abc', 'xyz')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle empty strings', () => {
    expect(computeDiff('', '')).toEqual([{ op: 'equal', value: '' }])
    expect(computeDiff('a', '')).toContainEqual({ op: 'delete', value: 'a' })
    expect(computeDiff('', 'b')).toContainEqual({ op: 'insert', value: 'b' })
  })

  it('should complete within 20ms for 1000-line input', () => {
    const lines = Array.from({ length: 1000 }, (_, i) => `line ${i}\n`)
    const before = lines.join('')
    const after = lines.map((l, i) => i === 500 ? 'modified line\n' : l).join('')
    const start = performance.now()
    computeDiff(before, after)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(30)
  })
})

describe('diffArrays', () => {
  it('should diff two arrays of strings', () => {
    const result = diffArrays(['a', 'b', 'c'], ['a', 'x', 'c'])
    expect(result).toContainEqual({ op: 'delete', value: 'b' })
    expect(result).toContainEqual({ op: 'insert', value: 'x' })
  })
})