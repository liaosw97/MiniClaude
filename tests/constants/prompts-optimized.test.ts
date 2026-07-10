import { describe, it, expect, beforeEach } from 'vitest'
import {
  optimizedSystemPrompt,
  detectModelProvider,
  loadSystemPrompt,
  resetModelProviderCache,
} from 'src/constants/prompts-optimized'

describe('精简版 System Prompt', () => {
  it('应导出 optimizedSystemPrompt', () => {
    expect(optimizedSystemPrompt).toBeDefined()
    expect(typeof optimizedSystemPrompt).toBe('string')
  })

  it('应包含核心指令', () => {
    expect(optimizedSystemPrompt.length).toBeGreaterThan(0)
  })

  it('应包含工具使用规范', () => {
    expect(optimizedSystemPrompt).toContain('BashTool')
    expect(optimizedSystemPrompt).toContain('FileEditTool')
    expect(optimizedSystemPrompt).toContain('AgentTool')
  })

  it('应包含安全边界', () => {
    expect(optimizedSystemPrompt).toContain('安全')
  })

  it('应包含响应风格优化', () => {
    expect(optimizedSystemPrompt).toContain('不使用"让我来..."')
    expect(optimizedSystemPrompt).toContain('直接')
  })

  it('应导出 detectModelProvider 函数', () => {
    expect(typeof detectModelProvider).toBe('function')
  })

  it('应导出 loadSystemPrompt 函数', () => {
    expect(typeof loadSystemPrompt).toBe('function')
  })

  it('loadSystemPrompt 应返回字符串', () => {
    const prompt = loadSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })
})

describe('detectModelProvider', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_MODEL
    delete process.env.ANTHROPIC_BASE_URL
    resetModelProviderCache()
  })

  it('should detect mimo by model name', () => {
    process.env.ANTHROPIC_MODEL = 'mimo-v2.5-pro'
    expect(detectModelProvider()).toBe('mimo')
  })

  it('should detect deepseek by model name', () => {
    process.env.ANTHROPIC_MODEL = 'deepseek-v4-pro'
    expect(detectModelProvider()).toBe('deepseek')
  })

  it('should detect glm by model name', () => {
    process.env.ANTHROPIC_MODEL = 'glm5'
    expect(detectModelProvider()).toBe('glm')
  })

  it('should detect model in proxy scenario', () => {
    process.env.ANTHROPIC_MODEL = 'deepseek-v4-pro'
    process.env.ANTHROPIC_BASE_URL = 'https://proxy.example.com/v1'
    expect(detectModelProvider()).toBe('deepseek')
  })

  it('should return unknown for unrecognized model', () => {
    process.env.ANTHROPIC_MODEL = 'some-unknown-model'
    process.env.ANTHROPIC_BASE_URL = 'https://api.example.com/v1'
    expect(detectModelProvider()).toBe('unknown')
  })

  it('should detect mimo by base URL when model name not set', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.mimo.ai/v1'
    expect(detectModelProvider()).toBe('mimo')
  })

  it('should prioritize model name over base URL', () => {
    process.env.ANTHROPIC_MODEL = 'deepseek-v4-pro'
    process.env.ANTHROPIC_BASE_URL = 'https://api.mimo.ai/v1'
    expect(detectModelProvider()).toBe('deepseek')
  })

  it('should detect minimax by base URL', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.minimax.chat/v1'
    expect(detectModelProvider()).toBe('minimax')
  })

  it('should handle empty environment variables', () => {
    expect(detectModelProvider()).toBe('unknown')
  })

  it('should cache detection result', () => {
    process.env.ANTHROPIC_MODEL = 'mimo-v2.5-pro'
    const first = detectModelProvider()
    process.env.ANTHROPIC_MODEL = 'deepseek-v4-pro'
    const second = detectModelProvider()
    expect(first).toBe('mimo')
    expect(second).toBe('mimo') // 缓存生效
  })

  it('should detect deepseek by base URL', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.deepseek.com/v1'
    expect(detectModelProvider()).toBe('deepseek')
  })

  it('should detect glm by base URL', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://api.glm.ai/v1'
    expect(detectModelProvider()).toBe('glm')
  })
})

describe('loadSystemPrompt', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_MODEL
    delete process.env.ANTHROPIC_BASE_URL
    resetModelProviderCache()
  })

  it('should load mimo patch for mimo model', () => {
    process.env.ANTHROPIC_MODEL = 'mimo-v2.5-pro'
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('mimo 优化')
  })

  it('should load deepseek patch for deepseek model', () => {
    process.env.ANTHROPIC_MODEL = 'deepseek-v4-pro'
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('DeepSeek V4 优化')
  })

  it('should load glm patch for glm model', () => {
    process.env.ANTHROPIC_MODEL = 'glm5'
    const prompt = loadSystemPrompt()
    expect(prompt).toContain('GLM-5')
  })

  it('should use generic prompt for minimax/unknown', () => {
    process.env.ANTHROPIC_MODEL = 'minimax'
    resetModelProviderCache()
    const prompt = loadSystemPrompt()
    expect(prompt).not.toContain('mimo 优化')
    expect(prompt).not.toContain('DeepSeek V4 优化')
    expect(prompt).not.toContain('GLM-5')
  })
})
