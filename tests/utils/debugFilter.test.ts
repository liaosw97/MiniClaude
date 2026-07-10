import { describe, it, expect } from 'vitest'
import {
  parseDebugFilter,
  extractDebugCategories,
  shouldShowDebugCategories,
  shouldShowDebugMessage,
} from '../../src/utils/debugFilter'

describe('parseDebugFilter', () => {
  it('undefined → null', () => {
    expect(parseDebugFilter(undefined)).toBeNull()
  })

  it('空字符串 → null', () => {
    expect(parseDebugFilter('')).toBeNull()
  })

  it('纯空格 → null', () => {
    expect(parseDebugFilter('   ')).toBeNull()
  })

  it('包含过滤器 → 解析为 include', () => {
    const result = parseDebugFilter('api,hooks')
    expect(result).toEqual({
      include: ['api', 'hooks'],
      exclude: [],
      isExclusive: false,
    })
  })

  it('排除过滤器 → 解析为 exclude', () => {
    const result = parseDebugFilter('!api,!hooks')
    expect(result).toEqual({
      include: [],
      exclude: ['api', 'hooks'],
      isExclusive: true,
    })
  })

  it('混合包含/排除 → null（无效）', () => {
    expect(parseDebugFilter('api,!hooks')).toBeNull()
  })

  it('单个过滤器', () => {
    const result = parseDebugFilter('mcp')
    expect(result).toEqual({
      include: ['mcp'],
      exclude: [],
      isExclusive: false,
    })
  })
})

describe('extractDebugCategories', () => {
  it('简单前缀 "api: message" → ["api"]', () => {
    expect(extractDebugCategories('api: connecting')).toContain('api')
  })

  it('方括号 "[MCP] message" → ["mcp"]', () => {
    expect(extractDebugCategories('[MCP] connecting')).toContain('mcp')
  })

  it('MCP server "name" → ["mcp", "name"]', () => {
    const categories = extractDebugCategories('MCP server "my-server": connecting')
    expect(categories).toContain('mcp')
    expect(categories).toContain('my-server')
  })

  it('1P event → 包含 "1p"', () => {
    expect(extractDebugCategories('1P event: tengu_timer')).toContain('1p')
  })

  it('无匹配 → 空数组', () => {
    expect(extractDebugCategories('just a message')).toEqual([])
  })
})

describe('shouldShowDebugCategories', () => {
  it('filter 为 null → true', () => {
    expect(shouldShowDebugCategories(['api'], null)).toBe(true)
  })

  it('无分类 → false', () => {
    expect(shouldShowDebugCategories([], { include: ['api'], exclude: [], isExclusive: false })).toBe(false)
  })

  it('包含模式 - 匹配 → true', () => {
    expect(shouldShowDebugCategories(['api'], { include: ['api'], exclude: [], isExclusive: false })).toBe(true)
  })

  it('包含模式 - 不匹配 → false', () => {
    expect(shouldShowDebugCategories(['mcp'], { include: ['api'], exclude: [], isExclusive: false })).toBe(false)
  })

  it('排除模式 - 未排除 → true', () => {
    expect(shouldShowDebugCategories(['api'], { include: [], exclude: ['mcp'], isExclusive: true })).toBe(true)
  })

  it('排除模式 - 已排除 → false', () => {
    expect(shouldShowDebugCategories(['api'], { include: [], exclude: ['api'], isExclusive: true })).toBe(false)
  })
})

describe('shouldShowDebugMessage', () => {
  it('filter 为 null → true', () => {
    expect(shouldShowDebugMessage('any message', null)).toBe(true)
  })

  it('包含模式 - 匹配 → true', () => {
    expect(shouldShowDebugMessage('api: test', { include: ['api'], exclude: [], isExclusive: false })).toBe(true)
  })

  it('包含模式 - 不匹配 → false', () => {
    expect(shouldShowDebugMessage('mcp: test', { include: ['api'], exclude: [], isExclusive: false })).toBe(false)
  })
})
