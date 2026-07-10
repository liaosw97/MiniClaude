import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../../src/Tool.js', () => ({
  buildTool: vi.fn((config: any) => config),
}))

vi.mock('../../../src/utils/lazySchema.js', () => ({
  lazySchema: vi.fn((fn: () => any) => {
    const result = fn()
    return () => result
  }),
}))

vi.mock('./constants.js', () => ({
  VERIFY_PLAN_EXECUTION_TOOL_NAME: 'VerifyPlanExecution',
}))

// Import after mocks
const { VerifyPlanExecutionTool } = await import('../../../src/tools/VerifyPlanExecutionTool/VerifyPlanExecutionTool.js')

describe('VerifyPlanExecutionTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(VerifyPlanExecutionTool.name).toBe('VerifyPlanExecution')
    })

    it('应该被禁用', () => {
      expect(VerifyPlanExecutionTool.isEnabled()).toBe(false)
    })

    it('应该支持并发', () => {
      expect(VerifyPlanExecutionTool.isConcurrencySafe()).toBe(true)
    })

    it('应该是只读的', () => {
      expect(VerifyPlanExecutionTool.isReadOnly()).toBe(true)
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(VerifyPlanExecutionTool.inputSchema).toBeDefined()
    })

    it('应该是空对象', () => {
      const schema = VerifyPlanExecutionTool.inputSchema
      expect(Object.keys(schema.shape)).toHaveLength(0)
    })
  })

  describe('输出模式', () => {
    it('应该定义输出模式', () => {
      expect(VerifyPlanExecutionTool.outputSchema).toBeDefined()
    })

    it('应该包含 verified 字段', () => {
      const schema = VerifyPlanExecutionTool.outputSchema
      expect(schema.shape.verified).toBeDefined()
    })

    it('应该包含 message 字段', () => {
      const schema = VerifyPlanExecutionTool.outputSchema
      expect(schema.shape.message).toBeDefined()
    })
  })

  describe('description', () => {
    it('应该返回不可用消息', async () => {
      const description = await VerifyPlanExecutionTool.description()
      expect(description).toContain('unavailable')
      expect(description).toContain('reconstructed build')
    })
  })

  describe('prompt', () => {
    it('应该返回不可用消息', async () => {
      const prompt = await VerifyPlanExecutionTool.prompt()
      expect(prompt).toContain('unavailable')
      expect(prompt).toContain('reconstructed build')
    })
  })

  describe('call', () => {
    it('应该返回未验证状态', async () => {
      const result = await VerifyPlanExecutionTool.call({}, {} as any)

      expect(result).toEqual({
        data: {
          verified: false,
          message: expect.stringContaining('unavailable'),
        },
      })
    })

    it('返回的消息应该包含不可用原因', async () => {
      const result = await VerifyPlanExecutionTool.call({}, {} as any)

      expect(result.data.message).toContain('reconstructed build')
    })
  })

  describe('mapToolResultToToolResultBlockParam', () => {
    it('应该返回 tool_result 格式', () => {
      const output = {
        verified: false,
        message: 'Plan execution verification is unavailable.',
      }

      const result = VerifyPlanExecutionTool.mapToolResultToToolResultBlockParam(
        output,
        'tool-use-id',
      )

      expect(result).toEqual({
        tool_use_id: 'tool-use-id',
        type: 'tool_result',
        content: 'Plan execution verification is unavailable.',
      })
    })

    it('应该正确传递消息内容', () => {
      const output = {
        verified: true,
        message: 'Plan verified successfully.',
      }

      const result = VerifyPlanExecutionTool.mapToolResultToToolResultBlockParam(
        output,
        'test-id',
      )

      expect(result.content).toBe('Plan verified successfully.')
    })
  })

  describe('渲染函数', () => {
    it('renderToolUseMessage 应该返回 null', () => {
      expect(VerifyPlanExecutionTool.renderToolUseMessage()).toBeNull()
    })

    it('renderToolResultMessage 应该返回 null', () => {
      expect(VerifyPlanExecutionTool.renderToolResultMessage()).toBeNull()
    })
  })
})
