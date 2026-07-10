import { describe, it, expect } from 'vitest'
import { djb2Hash, hashContent } from '../../src/utils/hash'

describe('djb2Hash', () => {
  it('空字符串 → 0', () => {
    expect(djb2Hash('')).toBe(0)
  })

  it('相同输入 → 相同输出', () => {
    expect(djb2Hash('hello')).toBe(djb2Hash('hello'))
  })

  it('不同输入 → 不同输出', () => {
    expect(djb2Hash('hello')).not.toBe(djb2Hash('world'))
  })

  it('返回数字', () => {
    expect(typeof djb2Hash('test')).toBe('number')
  })
})

describe('hashContent', () => {
  it('相同内容 → 相同哈希', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'))
  })

  it('不同内容 → 不同哈希', () => {
    expect(hashContent('hello')).not.toBe(hashContent('world'))
  })

  it('返回字符串', () => {
    expect(typeof hashContent('test')).toBe('string')
  })

  it('空字符串 → 返回哈希', () => {
    expect(hashContent('')).toBeDefined()
  })
})
