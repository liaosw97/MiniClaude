import { describe, it, expect } from 'vitest'
import { intersperse, count, uniq } from '../../src/utils/array'

describe('intersperse', () => {
  it('空数组 → 返回空数组', () => {
    expect(intersperse([], (i) => i)).toEqual([])
  })

  it('单元素 → 返回原数组', () => {
    expect(intersperse([1], (i) => i)).toEqual([1])
  })

  it('多元素 → 在元素间插入分隔符', () => {
    expect(intersperse([1, 2, 3], (i) => 0)).toEqual([1, 0, 2, 0, 3])
  })

  it('分隔符使用索引', () => {
    expect(intersperse(['a', 'b', 'c'], (i) => i.toString())).toEqual(['a', '1', 'b', '2', 'c'])
  })
})

describe('count', () => {
  it('空数组 → 返回 0', () => {
    expect(count([], () => true)).toBe(0)
  })

  it('无匹配 → 返回 0', () => {
    expect(count([1, 2, 3], (x) => x > 5)).toBe(0)
  })

  it('全部匹配 → 返回长度', () => {
    expect(count([1, 2, 3], (x) => x > 0)).toBe(3)
  })

  it('部分匹配 → 返回匹配数', () => {
    expect(count([1, 2, 3, 4, 5], (x) => x % 2 === 0)).toBe(2)
  })

  it('truthy/falsy 谓词', () => {
    expect(count([0, 1, null, 'a', ''], Boolean)).toBe(2)
  })
})

describe('uniq', () => {
  it('空数组 → 返回空数组', () => {
    expect(uniq([])).toEqual([])
  })

  it('无重复 → 返回原数组', () => {
    expect(uniq([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('有重复 → 去重', () => {
    expect(uniq([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
  })

  it('字符串去重', () => {
    expect(uniq(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
  })
})
