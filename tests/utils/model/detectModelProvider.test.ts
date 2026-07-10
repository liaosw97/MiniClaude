import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('detectModelProvider', () => {
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

  it('应导出 detectModelProvider 函数', async () => {
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(typeof detectModelProvider).toBe('function')
  })

  it('应返回有效的模型类型', async () => {
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    const result = detectModelProvider()
    expect(['deepseek', 'glm', 'minimax', 'claude', 'unknown']).toContain(result)
  })

  it('应检测 DeepSeek URL', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/v1'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(detectModelProvider()).toBe('deepseek')
  })

  it('应不区分大小写', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.DeepSeek.com/v1'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(detectModelProvider()).toBe('deepseek')
  })

  it('应支持带端口的 URL', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://deepseek.example.com:8080'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(detectModelProvider()).toBe('deepseek')
  })

  it('应通过模型名检测 GLM', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.openai.com/v1'
    process.env.ANTHROPIC_MODEL = 'glm-4'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(detectModelProvider()).toBe('glm')
  })

  it('应支持 glm-5.1 模型名', async () => {
    process.env.ANTHROPIC_MODEL = 'glm-5.1'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(detectModelProvider()).toBe('glm')
  })

  it('不应将其他 OpenAI 兼容 API 误判为 GLM', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.openai.com/v1'
    process.env.ANTHROPIC_MODEL = 'gpt-4'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(detectModelProvider()).not.toBe('glm')
  })

  it('应返回 unknown 作为默认值', async () => {
    process.env.ANTHROPIC_BASE_URL = ''
    process.env.ANTHROPIC_MODEL = ''
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(detectModelProvider()).toBe('unknown')
  })

  it('不应抛出异常', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://unknown-api.example.com'
    process.env.ANTHROPIC_MODEL = 'unknown-model'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    expect(() => detectModelProvider()).not.toThrow()
  })

  it('应缓存首次检测结果', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/v1'
    const { detectModelProvider } = await import('src/constants/prompts-optimized')
    const first = detectModelProvider()

    // 修改环境变量
    process.env.ANTHROPIC_BASE_URL = 'https://api.openai.com/v1'
    const second = detectModelProvider()

    // 应返回缓存值
    expect(first).toBe('deepseek')
    expect(second).toBe('deepseek')
  })
})
