import { describe, it, expect } from 'vitest'

describe('Token 使用率', () => {
  it('精简版 Prompt 应比原版更短', async () => {
    const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
    // 精简版应比原版短（原版 54KB，约 918 行）
    expect(optimizedSystemPrompt.length).toBeLessThan(5000)
  })

  it('应统计 Token 数量', async () => {
    const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
    const charCount = optimizedSystemPrompt.length
    const estimatedTokens = Math.ceil(charCount / 4) // 粗略估计
    console.log(`字符数: ${charCount}, 估计 Token 数: ${estimatedTokens}`)
    expect(estimatedTokens).toBeGreaterThan(0)
  })

  it('应包含核心功能', async () => {
    const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
    // 验证精简后仍包含核心功能
    expect(optimizedSystemPrompt).toContain('BashTool')
    expect(optimizedSystemPrompt).toContain('FileEditTool')
    expect(optimizedSystemPrompt).toContain('AgentTool')
    expect(optimizedSystemPrompt).toContain('安全')
  })
})
