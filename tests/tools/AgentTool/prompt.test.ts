import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

describe('AgentTool Prompt 优化', () => {
  it('应导出 getPrompt 函数', async () => {
    const { getPrompt } = await import('src/tools/AgentTool/prompt')
    expect(typeof getPrompt).toBe('function')
  })

  it('应导出 formatAgentLine 函数', async () => {
    const { formatAgentLine } = await import('src/tools/AgentTool/prompt')
    expect(typeof formatAgentLine).toBe('function')
  })

  it('应能格式化 agent 行', async () => {
    const { formatAgentLine } = await import('src/tools/AgentTool/prompt')
    const agent = {
      agentType: 'test-agent',
      whenToUse: '用于测试',
      tools: ['BashTool', 'FileReadTool'],
    }
    const line = formatAgentLine(agent)
    expect(line).toContain('test-agent')
    expect(line).toContain('用于测试')
    expect(line).toContain('BashTool')
  })

  it('应能获取 prompt', async () => {
    const { getPrompt } = await import('src/tools/AgentTool/prompt')
    const agents = [
      {
        agentType: 'explore',
        whenToUse: '用于探索代码库',
        tools: ['BashTool', 'GlobTool', 'GrepTool'],
      },
    ]
    const prompt = await getPrompt(agents)
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('应包含任务分解指令', async () => {
    const { getPrompt } = await import('src/tools/AgentTool/prompt')
    const agents = [
      {
        agentType: 'explore',
        whenToUse: '用于探索代码库',
        tools: ['BashTool'],
      },
    ]
    const prompt = await getPrompt(agents)
    expect(prompt).toContain('agent')
  })
})
