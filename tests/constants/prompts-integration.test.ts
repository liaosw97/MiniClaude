import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('精简版 Prompt 功能完整性', () => {
  const originalBaseUrl = process.env.ANTHROPIC_BASE_URL
  const originalModel = process.env.ANTHROPIC_MODEL

  beforeEach(() => {
    // 清除模块缓存
    vi.resetModules()
  })

  afterEach(() => {
    process.env.ANTHROPIC_BASE_URL = originalBaseUrl
    process.env.ANTHROPIC_MODEL = originalModel
  })

  it('应能加载精简版 Prompt', async () => {
    const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
    expect(optimizedSystemPrompt).toBeDefined()
    expect(optimizedSystemPrompt.length).toBeGreaterThan(100)
  })

  it('应包含工具使用指令', async () => {
    const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
    expect(optimizedSystemPrompt).toContain('BashTool')
    expect(optimizedSystemPrompt).toContain('FileEditTool')
    expect(optimizedSystemPrompt).toContain('AgentTool')
  })

  it('应包含安全边界', async () => {
    const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
    expect(optimizedSystemPrompt).toContain('安全')
  })

  it('应支持模型检测', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/v1'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(detectModelProvider()).toBe('deepseek')
  })

  it('应支持 DeepSeek 补丁加载', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/v1'
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('DeepSeek')
  })

  it('应支持 GLM 补丁加载', async () => {
    process.env.ANTHROPIC_MODEL = 'glm-5.1'
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('GLM')
  })

  it('未知模型应使用通用 Prompt', async () => {
    process.env.ANTHROPIC_BASE_URL = ''
    process.env.ANTHROPIC_MODEL = ''
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('你是一个专业的 AI 编程助手')
    expect(prompt).not.toContain('DeepSeek')
    expect(prompt).not.toContain('GLM')
  })
})
