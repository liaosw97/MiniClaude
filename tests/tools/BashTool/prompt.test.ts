import { describe, it, expect, beforeAll, vi } from 'vitest'

beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

describe.skip('BashTool Prompt 优化（需 bun:bundle 支持）', () => {
  it('应导出 prompt 相关函数', 30000, async () => {
    const module = await import('src/tools/BashTool/prompt')
    expect(module.getDefaultTimeoutMs).toBeDefined()
    expect(typeof module.getDefaultTimeoutMs).toBe('function')
  })

  it('应能获取超时配置', 30000, async () => {
    const { getDefaultTimeoutMs, getMaxTimeoutMs } = await import('src/tools/BashTool/prompt')
    const defaultTimeout = getDefaultTimeoutMs()
    const maxTimeout = getMaxTimeoutMs()
    expect(defaultTimeout).toBeGreaterThan(0)
    expect(maxTimeout).toBeGreaterThanOrEqual(defaultTimeout)
  })
})
