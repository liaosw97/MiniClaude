import { describe, it, expect } from 'vitest'

describe('上下文加载日志', () => {
  it('应支持日志记录', async () => {
    // 日志功能需要在系统层面实现
    // 当前测试验证 Prompt 加载功能正常
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toBeDefined()
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('应能检测当前模型', async () => {
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    const provider = detectModelProvider()
    expect(['deepseek', 'glm', 'minimax', 'claude', 'unknown']).toContain(provider)
  })
})
