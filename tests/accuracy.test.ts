import { describe, it, expect } from 'vitest'

describe('准确率测试', () => {
  it('应能加载精简版 Prompt', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toBeDefined()
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('应包含核心指令', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('BashTool')
    expect(prompt).toContain('FileEditTool')
    expect(prompt).toContain('AgentTool')
  })

  it('应包含安全边界', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('安全')
  })

  it('应包含响应风格优化', async () => {
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('不使用"让我来..."')
    expect(prompt).toContain('直接')
  })
})
