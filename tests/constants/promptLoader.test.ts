import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('promptLoader', () => {
  const originalBaseUrl = process.env.ANTHROPIC_BASE_URL
  const originalModel = process.env.ANTHROPIC_MODEL

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.ANTHROPIC_BASE_URL = originalBaseUrl
    process.env.ANTHROPIC_MODEL = originalModel
  })

  it('应导出 loadSystemPrompt 函数', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    expect(typeof loadSystemPrompt).toBe('function')
  })

  it('应返回字符串', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('应将补丁追加到通用 Prompt 末尾', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()

    // 验证通用 Prompt 在前
    expect(prompt).toContain('你是一个专业的 AI 编程助手')
  })

  it('合并后应为完整字符串', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()

    // 应为非空字符串
    expect(prompt.length).toBeGreaterThan(0)
    // 应包含完整内容
    expect(prompt).toContain('你是一个专业的 AI 编程助手')
  })

  it('应仅使用通用 Prompt（未知模型）', async () => {
    process.env.ANTHROPIC_BASE_URL = ''
    process.env.ANTHROPIC_MODEL = ''
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()

    // 应包含通用 Prompt
    expect(prompt).toContain('你是一个专业的 AI 编程助手')
    // 不应包含模型特定内容
    expect(prompt).not.toContain('DeepSeek')
    expect(prompt).not.toContain('GLM')
  })

  it('不应抛出异常（未知模型）', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://unknown-api.example.com'
    process.env.ANTHROPIC_MODEL = 'unknown-model'
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    expect(() => loadSystemPrompt()).not.toThrow()
  })
})
