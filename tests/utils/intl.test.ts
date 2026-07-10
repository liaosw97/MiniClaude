import { describe, it, expect } from 'vitest'
import { getGraphemeSegmenter, firstGrapheme } from '../../src/utils/intl'

describe('getGraphemeSegmenter', () => {
  it('返回 Intl.Segmenter 实例', () => {
    const segmenter = getGraphemeSegmenter()
    expect(segmenter).toBeInstanceOf(Intl.Segmenter)
  })

  it('多次调用 → 返回相同实例', () => {
    const s1 = getGraphemeSegmenter()
    const s2 = getGraphemeSegmenter()
    expect(s1).toBe(s2)
  })
})

describe('firstGrapheme', () => {
  it('空字符串 → 空字符串', () => {
    expect(firstGrapheme('')).toBe('')
  })

  it('ASCII 字符 → 返回第一个字符', () => {
    expect(firstGrapheme('hello')).toBe('h')
  })

  it('中文 → 返回第一个字', () => {
    expect(firstGrapheme('你好世界')).toBe('你')
  })

  it('emoji → 返回第一个 emoji', () => {
    expect(firstGrapheme('👋🌍')).toBe('👋')
  })
})
