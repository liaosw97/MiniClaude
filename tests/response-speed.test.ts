import { describe, it, expect } from 'vitest'

describe('响应速度', () => {
  it('Prompt 加载应快速完成', async () => {
    const start = Date.now()
    const { loadSystemPrompt } = await import('src/constants/prompts-optimized')
    loadSystemPrompt()
    const elapsed = Date.now() - start
    console.log(`Prompt 加载耗时: ${elapsed}ms`)
    expect(elapsed).toBeLessThan(100) // 应在 100ms 内完成
  })

  it('模型检测应快速完成', async () => {
    const start = Date.now()
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    detectModelProvider()
    const elapsed = Date.now() - start
    console.log(`模型检测耗时: ${elapsed}ms`)
    expect(elapsed).toBeLessThan(10) // 应在 10ms 内完成
  })

  it('精简版 Prompt 应包含响应优化指令', async () => {
    const { optimizedSystemPrompt } = await import('src/constants/prompts-optimized')
    // 验证包含响应速度优化指令
    expect(optimizedSystemPrompt).toContain('不使用"让我来..."')
    expect(optimizedSystemPrompt).toContain('直接')
    expect(optimizedSystemPrompt).toContain('不添加总结')
  })
})
