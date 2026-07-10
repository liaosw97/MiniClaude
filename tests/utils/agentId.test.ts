import { describe, it, expect, vi } from 'vitest'
import { formatAgentId, parseAgentId, generateRequestId, parseRequestId } from '../../src/utils/agentId'

describe('formatAgentId', () => {
  it('返回 agentName@teamName 格式', () => {
    expect(formatAgentId('researcher', 'my-project')).toBe('researcher@my-project')
  })

  it('agentName 包含特殊字符', () => {
    expect(formatAgentId('team-lead', 'proj')).toBe('team-lead@proj')
  })
})

describe('parseAgentId', () => {
  it('有效 ID → 返回组件', () => {
    const result = parseAgentId('researcher@my-project')
    expect(result).toEqual({ agentName: 'researcher', teamName: 'my-project' })
  })

  it('无 @ 分隔符 → 返回 null', () => {
    expect(parseAgentId('invalid')).toBeNull()
  })

  it('多个 @ → 以第一个分割', () => {
    const result = parseAgentId('a@b@c')
    expect(result).toEqual({ agentName: 'a', teamName: 'b@c' })
  })

  it('空字符串 → 返回 null', () => {
    expect(parseAgentId('')).toBeNull()
  })
})

describe('generateRequestId', () => {
  it('返回 requestType-timestamp@agentId 格式', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1702500000000)
    const result = generateRequestId('shutdown', 'researcher@my-project')
    expect(result).toBe('shutdown-1702500000000@researcher@my-project')
    vi.restoreAllMocks()
  })
})

describe('parseRequestId', () => {
  it('有效请求 ID → 返回组件', () => {
    const result = parseRequestId('shutdown-1702500000000@researcher@my-project')
    expect(result).toEqual({
      requestType: 'shutdown',
      timestamp: 1702500000000,
      agentId: 'researcher@my-project',
    })
  })

  it('无 @ 分隔符 → 返回 null', () => {
    expect(parseRequestId('invalid')).toBeNull()
  })

  it('无 - 分隔符 → 返回 null', () => {
    expect(parseRequestId('invalid@agent')).toBeNull()
  })

  it('时间戳非数字 → 返回 null', () => {
    expect(parseRequestId('shutdown-abc@agent')).toBeNull()
  })

  it('空字符串 → 返回 null', () => {
    expect(parseRequestId('')).toBeNull()
  })
})
