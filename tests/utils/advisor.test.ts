import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock heavy dependencies
vi.mock('../../src/services/analytics/growthbook.js', () => ({
  getFeatureValue_CACHED_MAY_BE_STALE: vi.fn(() => ({})),
}))
vi.mock('../../src/utils/betas.js', () => ({
  shouldIncludeFirstPartyOnlyBetas: vi.fn(() => true),
}))
vi.mock('../../src/utils/settings/settings.js', () => ({
  getInitialSettings: vi.fn(() => ({})),
}))

import {
  isAdvisorBlock,
  modelSupportsAdvisor,
  isValidAdvisorModel,
  getAdvisorUsage,
} from '../../src/utils/advisor.js'

describe('isAdvisorBlock', () => {
  it('识别 advisor_tool_result 类型', () => {
    expect(
      isAdvisorBlock({ type: 'advisor_tool_result' }),
    ).toBe(true)
  })

  it('识别 server_tool_use + advisor 名称', () => {
    expect(
      isAdvisorBlock({ type: 'server_tool_use', name: 'advisor' }),
    ).toBe(true)
  })

  it('拒绝 server_tool_use + 非 advisor 名称', () => {
    expect(
      isAdvisorBlock({ type: 'server_tool_use', name: 'other' }),
    ).toBe(false)
  })

  it('拒绝其他类型', () => {
    expect(isAdvisorBlock({ type: 'text' })).toBe(false)
  })
})

describe('modelSupportsAdvisor', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.USER_TYPE
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('支持 opus-4-6', () => {
    expect(modelSupportsAdvisor('claude-opus-4-6')).toBe(true)
  })

  it('支持 sonnet-4-6', () => {
    expect(modelSupportsAdvisor('claude-sonnet-4-6')).toBe(true)
  })

  it('不支持旧模型', () => {
    expect(modelSupportsAdvisor('claude-3-5-sonnet')).toBe(false)
  })

  it('ant 用户总是支持', () => {
    process.env.USER_TYPE = 'ant'
    expect(modelSupportsAdvisor('any-model')).toBe(true)
  })
})

describe('isValidAdvisorModel', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.USER_TYPE
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('opus-4-6 可作为 advisor', () => {
    expect(isValidAdvisorModel('claude-opus-4-6')).toBe(true)
  })

  it('sonnet-4-6 可作为 advisor', () => {
    expect(isValidAdvisorModel('claude-sonnet-4-6')).toBe(true)
  })

  it('其他模型不可作为 advisor', () => {
    expect(isValidAdvisorModel('claude-3-5-haiku')).toBe(false)
  })

  it('ant 用户任何模型都可作为 advisor', () => {
    process.env.USER_TYPE = 'ant'
    expect(isValidAdvisorModel('any-model')).toBe(true)
  })
})

describe('getAdvisorUsage', () => {
  it('返回空数组当无 iterations', () => {
    expect(getAdvisorUsage({} as any)).toEqual([])
  })

  it('返回空数组当 iterations 为 null', () => {
    expect(getAdvisorUsage({ iterations: null } as any)).toEqual([])
  })

  it('过滤 advisor_message 类型', () => {
    const usage = {
      iterations: [
        { type: 'advisor_message' },
        { type: 'other' },
        { type: 'advisor_message' },
      ],
    }
    const result = getAdvisorUsage(usage as any)
    expect(result).toHaveLength(2)
  })
})
