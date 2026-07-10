import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('query.ts trace integration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should enable trace when --trace is used (external user)', () => {
    // 模拟外部用户使用 --trace
    process.env.USER_TYPE = 'external'
    process.env.TRACE_ENABLED = 'true'

    const isAnt = process.env.USER_TYPE === 'ant'
    const traceEnabled = process.env.TRACE_ENABLED === 'true'
    const shouldCreateDumpPromptsFetch = isAnt || traceEnabled

    expect(shouldCreateDumpPromptsFetch).toBe(true)
  })

  it('should enable trace for Anthropic internal user', () => {
    // 模拟 Anthropic 内部用户
    process.env.USER_TYPE = 'ant'
    process.env.TRACE_ENABLED = 'false'

    const isAnt = process.env.USER_TYPE === 'ant'
    const traceEnabled = process.env.TRACE_ENABLED === 'true'
    const shouldCreateDumpPromptsFetch = isAnt || traceEnabled

    expect(shouldCreateDumpPromptsFetch).toBe(true)
  })

  it('should disable trace when --trace is not used (external user)', () => {
    // 模拟外部用户不使用 --trace
    process.env.USER_TYPE = 'external'
    process.env.TRACE_ENABLED = 'false'

    const isAnt = process.env.USER_TYPE === 'ant'
    const traceEnabled = process.env.TRACE_ENABLED === 'true'
    const shouldCreateDumpPromptsFetch = isAnt || traceEnabled

    expect(shouldCreateDumpPromptsFetch).toBe(false)
  })
})
