import { describe, it, expect, beforeEach } from 'vitest'
import {
  getContextWindowForModel,
  getModelMaxOutputTokens,
  MODEL_CONTEXT_WINDOW_DEFAULT,
} from 'src/utils/context'
import { resetModelProviderCache } from 'src/constants/prompts-optimized'

describe('getContextWindowForModel - third party', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS
    delete process.env.USER_TYPE
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
  })

  it('should return 1M when CLAUDE_CODE_MAX_CONTEXT_TOKENS is set for non-ant user', () => {
    process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = '1000000'
    process.env.USER_TYPE = '' // 非 ant 用户
    expect(getContextWindowForModel('mimo-v2.5-pro')).toBe(1_000_000)
  })

  it('should return 1M for [1m] suffix', () => {
    expect(getContextWindowForModel('mimo-v2.5-pro[1m]')).toBe(1_000_000)
  })

  it('should return 200K by default', () => {
    delete process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS
    expect(getContextWindowForModel('mimo-v2.5-pro')).toBe(MODEL_CONTEXT_WINDOW_DEFAULT)
  })

  it('should prioritize env var over [1m] suffix', () => {
    process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = '500000'
    expect(getContextWindowForModel('mimo-v2.5-pro[1m]')).toBe(500_000)
  })

  it('should work for ant user too', () => {
    process.env.USER_TYPE = 'ant'
    process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = '800000'
    expect(getContextWindowForModel('mimo-v2.5-pro')).toBe(800_000)
  })

  it('should ignore invalid env var', () => {
    process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = 'invalid'
    expect(getContextWindowForModel('mimo-v2.5-pro')).toBe(MODEL_CONTEXT_WINDOW_DEFAULT)
  })

  it('should ignore zero env var', () => {
    process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = '0'
    expect(getContextWindowForModel('mimo-v2.5-pro')).toBe(MODEL_CONTEXT_WINDOW_DEFAULT)
  })
})

describe('getModelMaxOutputTokens - third party', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_MODEL
    delete process.env.ANTHROPIC_BASE_URL
    delete process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS
    resetModelProviderCache()
  })

  it('should return 128K for mimo', () => {
    process.env.ANTHROPIC_MODEL = 'mimo-v2.5-pro'
    resetModelProviderCache()
    expect(getModelMaxOutputTokens('mimo-v2.5-pro')).toEqual({
      default: 128_000,
      upperLimit: 128_000,
    })
  })

  it('should return 128K/384K for deepseek', () => {
    process.env.ANTHROPIC_MODEL = 'deepseek-v4-pro'
    resetModelProviderCache()
    expect(getModelMaxOutputTokens('deepseek-v4-pro')).toEqual({
      default: 128_000,
      upperLimit: 384_000,
    })
  })

  it('should return 128K for glm5', () => {
    process.env.ANTHROPIC_MODEL = 'glm5'
    resetModelProviderCache()
    expect(getModelMaxOutputTokens('glm5')).toEqual({
      default: 128_000,
      upperLimit: 128_000,
    })
  })

  it('should return default for minimax/unknown', () => {
    process.env.ANTHROPIC_MODEL = 'minimax'
    resetModelProviderCache()
    expect(getModelMaxOutputTokens('minimax')).toEqual({
      default: 32_000,
      upperLimit: 64_000,
    })
  })

  it('should respect CLAUDE_CODE_MAX_OUTPUT_TOKENS env var', () => {
    process.env.ANTHROPIC_MODEL = 'mimo-v2.5-pro'
    process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = '64000'
    resetModelProviderCache()
    const result = getModelMaxOutputTokens('mimo-v2.5-pro')
    expect(result.default).toBe(64_000)
    expect(result.upperLimit).toBe(128_000) // upperLimit 不受环境变量影响
  })

  it('should cap default to upperLimit', () => {
    process.env.ANTHROPIC_MODEL = 'mimo-v2.5-pro'
    process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = '200000'
    resetModelProviderCache()
    const result = getModelMaxOutputTokens('mimo-v2.5-pro')
    expect(result.default).toBe(128_000) // capped to upperLimit
    expect(result.upperLimit).toBe(128_000)
  })
})
