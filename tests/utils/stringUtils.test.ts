import { describe, it, expect } from 'vitest'
import { escapeRegExp, capitalize, plural, countCharInString } from '../../src/utils/stringUtils'

describe('escapeRegExp', () => {
  it('无特殊字符 → 原样返回', () => {
    expect(escapeRegExp('hello')).toBe('hello')
  })

  it('特殊字符 → 转义', () => {
    expect(escapeRegExp('foo.bar')).toBe('foo\\.bar')
    expect(escapeRegExp('a+b')).toBe('a\\+b')
    expect(escapeRegExp('a*b')).toBe('a\\*b')
    expect(escapeRegExp('a?b')).toBe('a\\?b')
    expect(escapeRegExp('a^b')).toBe('a\\^b')
    expect(escapeRegExp('a$b')).toBe('a\\$b')
    expect(escapeRegExp('a{b')).toBe('a\\{b')
    expect(escapeRegExp('a}b')).toBe('a\\}b')
    expect(escapeRegExp('a(b')).toBe('a\\(b')
    expect(escapeRegExp('a)b')).toBe('a\\)b')
    expect(escapeRegExp('a|b')).toBe('a\\|b')
    expect(escapeRegExp('a[b')).toBe('a\\[b')
    expect(escapeRegExp('a]b')).toBe('a\\]b')
    expect(escapeRegExp('a\\b')).toBe('a\\\\b')
  })

  it('空字符串 → 空字符串', () => {
    expect(escapeRegExp('')).toBe('')
  })
})

describe('capitalize', () => {
  it('首字母大写', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('已是大写 → 不变', () => {
    expect(capitalize('Hello')).toBe('Hello')
  })

  it('驼峰 → 仅首字母大写', () => {
    expect(capitalize('fooBar')).toBe('FooBar')
  })

  it('空字符串 → 空字符串', () => {
    expect(capitalize('')).toBe('')
  })

  it('单字符', () => {
    expect(capitalize('a')).toBe('A')
  })
})

describe('plural', () => {
  it('单数 → 原形', () => {
    expect(plural(1, 'file')).toBe('file')
  })

  it('复数 → 加 s', () => {
    expect(plural(2, 'file')).toBe('files')
  })

  it('零 → 复数', () => {
    expect(plural(0, 'file')).toBe('files')
  })

  it('自定义复数形式', () => {
    expect(plural(2, 'entry', 'entries')).toBe('entries')
    expect(plural(1, 'entry', 'entries')).toBe('entry')
  })
})

describe('countCharInString', () => {
  it('统计字符出现次数', () => {
    expect(countCharInString('hello', 'l')).toBe(2)
  })

  it('无匹配 → 0', () => {
    expect(countCharInString('hello', 'x')).toBe(0)
  })

  it('空字符串 → 0', () => {
    expect(countCharInString('', 'a')).toBe(0)
  })
})
