import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/services/mcp/normalization.js', () => ({
  normalizeNameForMCP: vi.fn((name: string) => {
    // Mirror actual implementation: preserve a-zA-Z0-9_-
    let normalized = name.replace(/[^a-zA-Z0-9_-]/g, '_')
    if (name.startsWith('claude.ai ')) {
      normalized = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '')
    }
    return normalized
  }),
}))

import {
  mcpInfoFromString,
  getMcpPrefix,
  buildMcpToolName,
  getToolNameForPermissionCheck,
  getMcpDisplayName,
  extractMcpToolDisplayName,
} from '../../../src/services/mcp/mcpStringUtils.js'

describe('mcpInfoFromString', () => {
  // Scenario: MCP 消息格式解析
  it('解析标准 MCP 工具名', () => {
    const result = mcpInfoFromString('mcp__server__tool')
    expect(result).toEqual({ serverName: 'server', toolName: 'tool' })
  })

  it('解析无工具名的 MCP 前缀', () => {
    const result = mcpInfoFromString('mcp__server')
    expect(result).toEqual({ serverName: 'server', toolName: undefined })
  })

  it('返回 null 当非 mcp 前缀', () => {
    expect(mcpInfoFromString('bash')).toBeNull()
  })

  it('返回 null 当格式不正确', () => {
    expect(mcpInfoFromString('mcp__')).toBeNull()
  })

  it('处理工具名中的双下划线', () => {
    const result = mcpInfoFromString('mcp__server__tool__with__underscores')
    expect(result).toEqual({
      serverName: 'server',
      toolName: 'tool__with__underscores',
    })
  })

  it('返回 null 当只有 mcp', () => {
    expect(mcpInfoFromString('mcp')).toBeNull()
  })
})

describe('getMcpPrefix', () => {
  it('生成标准前缀', () => {
    const prefix = getMcpPrefix('myServer')
    expect(prefix).toBe('mcp__myServer__')
  })
})

describe('buildMcpToolName', () => {
  it('构建完整工具名', () => {
    const name = buildMcpToolName('myServer', 'myTool')
    expect(name).toBe('mcp__myServer__myTool')
  })
})

describe('getToolNameForPermissionCheck', () => {
  it('返回 MCP 全名当有 mcpInfo', () => {
    const tool = {
      name: 'tool',
      mcpInfo: { serverName: 'server', toolName: 'tool' },
    }
    expect(getToolNameForPermissionCheck(tool)).toBe('mcp__server__tool')
  })

  it('返回原始名当无 mcpInfo', () => {
    const tool = { name: 'BashTool' }
    expect(getToolNameForPermissionCheck(tool)).toBe('BashTool')
  })
})

describe('getMcpDisplayName', () => {
  it('移除 MCP 前缀', () => {
    const name = getMcpDisplayName('mcp__server__tool', 'server')
    expect(name).toBe('tool')
  })

  it('保留非 MCP 前缀部分', () => {
    const name = getMcpDisplayName('mcp__server__my_complex_tool', 'server')
    expect(name).toBe('my_complex_tool')
  })
})

describe('extractMcpToolDisplayName', () => {
  it('移除 (MCP) 后缀和服务器前缀', () => {
    const name = extractMcpToolDisplayName(
      'github - Add comment to issue (MCP)',
    )
    expect(name).toBe('Add comment to issue')
  })

  it('仅移除 (MCP) 后缀当无服务器前缀', () => {
    const name = extractMcpToolDisplayName('Add comment (MCP)')
    expect(name).toBe('Add comment')
  })

  it('返回原始名当无 (MCP) 后缀', () => {
    const name = extractMcpToolDisplayName('Add comment to issue')
    expect(name).toBe('Add comment to issue')
  })

  it('处理多余空白', () => {
    const name = extractMcpToolDisplayName('  github  -  Tool  (MCP)  ')
    expect(name).toBe('Tool')
  })
})
