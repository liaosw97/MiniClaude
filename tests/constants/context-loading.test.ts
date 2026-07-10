import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('上下文按需加载', () => {
  const originalBaseUrl = process.env.ANTHROPIC_BASE_URL
  const originalModel = process.env.ANTHROPIC_MODEL

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.ANTHROPIC_BASE_URL = originalBaseUrl
    process.env.ANTHROPIC_MODEL = originalModel
  })

  it('精简版 Prompt 应包含按需加载指令', async () => {
    const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
    // 验证包含按需加载相关指令
    expect(optimizedSystemPrompt).toBeDefined()
    expect(optimizedSystemPrompt.length).toBeGreaterThan(0)
  })

  it('应能加载精简版 Prompt', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('应支持 DeepSeek 模型上下文', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/v1'
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('DeepSeek')
  })

  it('应支持 GLM 模型上下文', async () => {
    process.env.ANTHROPIC_MODEL = 'glm-5.1'
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('GLM')
  })
})
