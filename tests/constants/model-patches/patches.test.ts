import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('模型补丁', () => {
  const originalBaseUrl = process.env.ANTHROPIC_BASE_URL
  const originalModel = process.env.ANTHROPIC_MODEL

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.ANTHROPIC_BASE_URL = originalBaseUrl
    process.env.ANTHROPIC_MODEL = originalModel
  })

  describe('DeepSeek V4 补丁', () => {
    it('应包含响应优化指令', async () => {
      process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/v1'
      const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
      const prompt = loadSystemPrompt()
      expect(prompt).toContain('DeepSeek')
      expect(prompt).toContain('开场白')
      expect(prompt).toContain('直接')
    })

    it('应包含工具调用优化', async () => {
      process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/v1'
      const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
      const prompt = loadSystemPrompt()
      expect(prompt).toContain('工具调用前不输出说明')
    })
  })

  describe('GLM-5.1 补丁', () => {
    it('应包含工具调用格式指令', async () => {
      process.env.ANTHROPIC_MODEL = 'glm-5.1'
      const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
      const prompt = loadSystemPrompt()
      expect(prompt).toContain('GLM')
      expect(prompt).toContain('JSON')
      expect(prompt).toContain('工具')
    })

    it('应包含代码生成约束', async () => {
      process.env.ANTHROPIC_MODEL = 'glm-5.1'
      const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
      const prompt = loadSystemPrompt()
      expect(prompt).toContain('代码')
      expect(prompt).toContain('语言和框架')
    })
  })

  describe('响应速度优化', () => {
    it('精简版 Prompt 应禁止开场白', async () => {
      const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
      expect(optimizedSystemPrompt).toContain('不使用"让我来..."')
      expect(optimizedSystemPrompt).toContain('开场白')
    })

    it('精简版 Prompt 应强调直接输出', async () => {
      const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
      expect(optimizedSystemPrompt).toContain('以动作或结论开头')
    })

    it('精简版 Prompt 应禁止引导语', async () => {
      const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
      expect(optimizedSystemPrompt).toContain('不使用"我将使用..."')
      expect(optimizedSystemPrompt).toContain('引导语')
    })

    it('精简版 Prompt 应要求直接呈现数据', async () => {
      const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
      expect(optimizedSystemPrompt).toContain('直接呈现')
      expect(optimizedSystemPrompt).toContain('结果')
    })

    it('精简版 Prompt 应禁止总结性文字', async () => {
      const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
      expect(optimizedSystemPrompt).toContain('不添加总结')
    })
  })
})
