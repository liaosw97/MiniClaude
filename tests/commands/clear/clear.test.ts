import { describe, it, expect, vi } from 'vitest'

// 只 mock 最必要的依赖
vi.mock('bun:bundle', () => ({
  feature: vi.fn(() => false),
}))

import clear from '../../../src/commands/clear/index'

describe('clear 命令', () => {
  it('类型为 local', () => {
    expect(clear.type).toBe('local')
  })

  it('名称为 clear', () => {
    expect(clear.name).toBe('clear')
  })

  it('有别名 reset 和 new', () => {
    expect(clear.aliases).toContain('reset')
    expect(clear.aliases).toContain('new')
  })

  it('有描述', () => {
    expect(clear.description).toBeTruthy()
  })

  it('supportsNonInteractive 为 false', () => {
    expect(clear.supportsNonInteractive).toBe(false)
  })

  it('load 函数存在且为函数', () => {
    expect(clear.load).toBeDefined()
    expect(typeof clear.load).toBe('function')
  })
})
