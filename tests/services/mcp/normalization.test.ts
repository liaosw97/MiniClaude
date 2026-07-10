import { describe, it, expect } from 'vitest'
import { normalizeNameForMCP } from '../../../src/services/mcp/normalization.js'

describe('normalizeNameForMCP', () => {
  // Scenario: MCP 服务器名称规范化
  it('保留合法字符', () => {
    expect(normalizeNameForMCP('my-server_1')).toBe('my-server_1')
  })

  it('替换非法字符为下划线', () => {
    expect(normalizeNameForMCP('my.server name')).toBe('my_server_name')
  })

  it('替换点号', () => {
    expect(normalizeNameForMCP('github.com')).toBe('github_com')
  })

  it('替换空格', () => {
    expect(normalizeNameForMCP('my server')).toBe('my_server')
  })

  it('处理 claude.ai 前缀 — 折叠连续下划线', () => {
    expect(normalizeNameForMCP('claude.ai my-server')).toBe('claude_ai_my-server')
  })

  it('处理 claude.ai 前缀 — 去除首尾下划线', () => {
    expect(normalizeNameForMCP('claude.ai  server')).toBe('claude_ai_server')
  })

  it('不折叠非 claude.ai 前缀的连续下划线', () => {
    expect(normalizeNameForMCP('my__server')).toBe('my__server')
  })

  it('处理空字符串', () => {
    expect(normalizeNameForMCP('')).toBe('')
  })

  it('处理纯特殊字符', () => {
    expect(normalizeNameForMCP('...')).toBe('___')
  })
})
