import { describe, it, expect } from 'vitest'
import { eagerParseCliFlag } from '../../src/utils/cliArgs'

describe('eagerParseCliFlag', () => {
  it('未找到 flag → undefined', () => {
    expect(eagerParseCliFlag('--settings', ['node', 'cli.js'])).toBeUndefined()
  })

  it('--flag value 语法', () => {
    expect(eagerParseCliFlag('--settings', ['node', 'cli.js', '--settings', 'path/to/settings'])).toBe('path/to/settings')
  })

  it('--flag=value 语法', () => {
    expect(eagerParseCliFlag('--settings', ['node', 'cli.js', '--settings=path/to/settings'])).toBe('path/to/settings')
  })

  it('flag 在最后 → undefined', () => {
    expect(eagerParseCliFlag('--settings', ['node', 'cli.js', '--settings'])).toBeUndefined()
  })

  it('空 argv → undefined', () => {
    expect(eagerParseCliFlag('--settings', [])).toBeUndefined()
  })

  it('使用默认 process.argv', () => {
    // 这个测试只验证不抛出异常
    expect(() => eagerParseCliFlag('--nonexistent')).not.toThrow()
  })
})
