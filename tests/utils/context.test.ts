import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('src/utils/config.js', () => ({
  getGlobalConfig: vi.fn(() => ({})),
}))

vi.mock('src/constants/prompts-optimized.js', () => ({
  detectModelProvider: vi.fn(() => 'anthropic'),
}))

vi.mock('src/utils/model/model.js', () => ({
  getCanonicalName: vi.fn((name: string) => name.toLowerCase()),
}))

vi.mock('src/utils/model/modelCapabilities.js', () => ({
  getModelCapability: vi.fn(() => null),
}))

import {
  is1mContextDisabled,
  has1mContext,
  modelSupports1M,
  getContextWindowForModel,
  getSonnet1mExpTreatmentEnabled,
  calculateContextPercentages,
  getModelMaxOutputTokens,
  getMaxThinkingTokensForModel,
  MODEL_CONTEXT_WINDOW_DEFAULT,
  COMPACT_MAX_OUTPUT_TOKENS,
  CAPPED_DEFAULT_MAX_TOKENS,
  ESCALATED_MAX_TOKENS,
} from '../../src/utils/context'
import { detectModelProvider } from 'src/constants/prompts-optimized.js'

describe('is1mContextDisabled', () => {
  const originalEnv = process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    } else {
      process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = originalEnv
    }
  })

  it('未设置 → false', () => {
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    expect(is1mContextDisabled()).toBe(false)
  })

  it('"true" → true', () => {
    process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = 'true'
    expect(is1mContextDisabled()).toBe(true)
  })
})

describe('has1mContext', () => {
  const originalEnv = process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    } else {
      process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = originalEnv
    }
  })

  it('模型包含 [1m] → true', () => {
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    expect(has1mContext('claude-sonnet-4-6[1m]')).toBe(true)
  })

  it('模型不包含 [1m] → false', () => {
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    expect(has1mContext('claude-sonnet-4-6')).toBe(false)
  })

  it('1M 被禁用 → false', () => {
    process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = 'true'
    expect(has1mContext('claude-sonnet-4-6[1m]')).toBe(false)
  })

  it('大小写不敏感', () => {
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    expect(has1mContext('claude-sonnet-4-6[1M]')).toBe(true)
  })
})

describe('calculateContextPercentages', () => {
  it('null usage → 返回 null', () => {
    const result = calculateContextPercentages(null, 100000)
    expect(result).toEqual({ used: null, remaining: null })
  })

  it('正常计算', () => {
    const usage = {
      input_tokens: 50000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }
    const result = calculateContextPercentages(usage, 100000)
    expect(result.used).toBe(50)
    expect(result.remaining).toBe(50)
  })

  it('包含缓存 token', () => {
    const usage = {
      input_tokens: 30000,
      cache_creation_input_tokens: 10000,
      cache_read_input_tokens: 10000,
    }
    const result = calculateContextPercentages(usage, 100000)
    expect(result.used).toBe(50)
    expect(result.remaining).toBe(50)
  })

  it('超过 100% → 钳位到 100', () => {
    const usage = {
      input_tokens: 150000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }
    const result = calculateContextPercentages(usage, 100000)
    expect(result.used).toBe(100)
    expect(result.remaining).toBe(0)
  })

  it('0 tokens → 0%', () => {
    const usage = {
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }
    const result = calculateContextPercentages(usage, 100000)
    expect(result.used).toBe(0)
    expect(result.remaining).toBe(100)
  })
})

describe('modelSupports1M', () => {
  const originalEnv = process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    } else {
      process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = originalEnv
    }
  })

  it('1M 被禁用 → false', () => {
    process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = 'true'
    expect(modelSupports1M('claude-sonnet-4-6')).toBe(false)
  })

  it('sonnet-4-6 支持 1M', () => {
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    expect(modelSupports1M('claude-sonnet-4-6')).toBe(true)
  })

  it('opus-4-6 支持 1M', () => {
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    expect(modelSupports1M('claude-opus-4-6')).toBe(true)
  })

  it('不支持的模型 → false', () => {
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    expect(modelSupports1M('claude-3-5-sonnet')).toBe(false)
  })
})

describe('getContextWindowForModel', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('环境变量覆盖优先', () => {
    process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = '50000'
    const result = getContextWindowForModel('claude-sonnet-4-6')
    expect(result).toBe(50000)
  })

  it('环境变量无效值 → 忽略', () => {
    process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = 'abc'
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    const result = getContextWindowForModel('claude-sonnet-4-6[1m]')
    expect(result).toBe(1_000_000)
  })

  it('环境变量为 0 → 忽略', () => {
    process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = '0'
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    const result = getContextWindowForModel('claude-sonnet-4-6[1m]')
    expect(result).toBe(1_000_000)
  })

  it('[1m] 后缀 → 1M context', () => {
    delete process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    const result = getContextWindowForModel('claude-sonnet-4-6[1m]')
    expect(result).toBe(1_000_000)
  })

  it('默认模型 → MODEL_CONTEXT_WINDOW_DEFAULT', () => {
    delete process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS
    delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
    const result = getContextWindowForModel('claude-unknown-model')
    expect(result).toBe(MODEL_CONTEXT_WINDOW_DEFAULT)
  })
})

describe('getModelMaxOutputTokens', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('opus-4-6 → 64k/128k', () => {
    delete process.env.USER_TYPE
    const result = getModelMaxOutputTokens('claude-opus-4-6')
    expect(result.default).toBe(64_000)
    expect(result.upperLimit).toBe(128_000)
  })

  it('sonnet-4-6 → 32k/128k', () => {
    delete process.env.USER_TYPE
    const result = getModelMaxOutputTokens('claude-sonnet-4-6')
    expect(result.default).toBe(32_000)
    expect(result.upperLimit).toBe(128_000)
  })

  it('claude-3-opus → 4096/4096', () => {
    delete process.env.USER_TYPE
    const result = getModelMaxOutputTokens('claude-3-opus')
    expect(result.default).toBe(4_096)
    expect(result.upperLimit).toBe(4_096)
  })

  it('claude-3-5-sonnet → 8192/8192', () => {
    delete process.env.USER_TYPE
    const result = getModelMaxOutputTokens('claude-3-5-sonnet')
    expect(result.default).toBe(8_192)
    expect(result.upperLimit).toBe(8_192)
  })

  it('3-7-sonnet → 32k/64k', () => {
    delete process.env.USER_TYPE
    const result = getModelMaxOutputTokens('claude-3-7-sonnet')
    expect(result.default).toBe(32_000)
    expect(result.upperLimit).toBe(64_000)
  })

  it('未知模型 → 默认值', () => {
    delete process.env.USER_TYPE
    const result = getModelMaxOutputTokens('unknown-model')
    expect(result.default).toBe(32_000)
    expect(result.upperLimit).toBe(64_000)
  })

  it('mimo 提供商 → 128k/128k', () => {
    delete process.env.USER_TYPE
    vi.mocked(detectModelProvider).mockReturnValue('mimo' as any)
    const result = getModelMaxOutputTokens('some-model')
    expect(result.default).toBe(128_000)
    expect(result.upperLimit).toBe(128_000)
    vi.mocked(detectModelProvider).mockReturnValue('anthropic')
  })

  it('deepseek 提供商 → 128k/384k', () => {
    delete process.env.USER_TYPE
    vi.mocked(detectModelProvider).mockReturnValue('deepseek' as any)
    const result = getModelMaxOutputTokens('some-model')
    expect(result.default).toBe(128_000)
    expect(result.upperLimit).toBe(384_000)
    vi.mocked(detectModelProvider).mockReturnValue('anthropic')
  })

  it('环境变量覆盖 MAX_OUTPUT_TOKENS', () => {
    delete process.env.USER_TYPE
    vi.mocked(detectModelProvider).mockReturnValue('mimo' as any)
    process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = '50000'
    const result = getModelMaxOutputTokens('some-model')
    expect(result.default).toBe(50_000)
    vi.mocked(detectModelProvider).mockReturnValue('anthropic')
  })
})

describe('getMaxThinkingTokensForModel', () => {
  it('返回 upperLimit - 1', () => {
    delete process.env.USER_TYPE
    const result = getMaxThinkingTokensForModel('claude-opus-4-6')
    expect(result).toBe(128_000 - 1)
  })
})

describe('常量导出', () => {
  it('MODEL_CONTEXT_WINDOW_DEFAULT = 200_000', () => {
    expect(MODEL_CONTEXT_WINDOW_DEFAULT).toBe(200_000)
  })

  it('COMPACT_MAX_OUTPUT_TOKENS = 20_000', () => {
    expect(COMPACT_MAX_OUTPUT_TOKENS).toBe(20_000)
  })

  it('CAPPED_DEFAULT_MAX_TOKENS = 8_000', () => {
    expect(CAPPED_DEFAULT_MAX_TOKENS).toBe(8_000)
  })

  it('ESCALATED_MAX_TOKENS = 64_000', () => {
    expect(ESCALATED_MAX_TOKENS).toBe(64_000)
  })
})
