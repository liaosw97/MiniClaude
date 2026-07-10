import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../../src/Tool.js', () => ({
  buildTool: vi.fn((config: any) => config),
}))

vi.mock('../../../src/utils/errors.js', () => ({
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS: class extends Error {},
}))

vi.mock('../../../src/utils/lazySchema.js', () => ({
  lazySchema: vi.fn((fn: () => any) => {
    const result = fn()
    return () => result
  }),
}))

vi.mock('../../../src/utils/permissions/PermissionResult.js', () => ({}))

vi.mock('../../../src/utils/slowOperations.js', () => ({
  jsonStringify: vi.fn((obj: any) => JSON.stringify(obj)),
}))

// Import after mocks
const {
  SyntheticOutputTool,
  isSyntheticOutputToolEnabled,
  SYNTHETIC_OUTPUT_TOOL_NAME,
} = await import('../../../src/tools/SyntheticOutputTool/SyntheticOutputTool.js')

describe('SyntheticOutputTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('常量', () => {
    it('应该有正确的工具名称', () => {
      expect(SYNTHETIC_OUTPUT_TOOL_NAME).toBe('StructuredOutput')
    })
  })

  describe('isSyntheticOutputToolEnabled', () => {
    it('非交互式会话应该启用', () => {
      expect(isSyntheticOutputToolEnabled({ isNonInteractiveSession: true })).toBe(true)
    })

    it('交互式会话应该禁用', () => {
      expect(isSyntheticOutputToolEnabled({ isNonInteractiveSession: false })).toBe(false)
    })
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(SyntheticOutputTool.name).toBe('StructuredOutput')
    })

    it('应该启用', () => {
      expect(SyntheticOutputTool.isEnabled()).toBe(true)
    })

    it('应该支持并发', () => {
      expect(SyntheticOutputTool.isConcurrencySafe()).toBe(true)
    })

    it('应该是只读的', () => {
      expect(SyntheticOutputTool.isReadOnly()).toBe(true)
    })

    it('不应该是开放世界', () => {
      expect(SyntheticOutputTool.isOpenWorld()).toBe(false)
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(SyntheticOutputTool.inputSchema).toBeDefined()
    })

    it('应该接受任意对象', () => {
      const schema = SyntheticOutputTool.inputSchema
      expect(schema).toBeDefined()
    })
  })

  describe('输出模式', () => {
    it('应该定义输出模式', () => {
      expect(SyntheticOutputTool.outputSchema).toBeDefined()
    })
  })

  describe('description', () => {
    it('应该返回描述', async () => {
      const description = await SyntheticOutputTool.description()
      expect(description).toContain('structured')
      expect(description).toContain('format')
    })
  })

  describe('prompt', () => {
    it('应该返回提示', async () => {
      const prompt = await SyntheticOutputTool.prompt()
      expect(prompt).toContain('structured')
      expect(prompt).toContain('exactly once')
    })
  })

  describe('call', () => {
    it('应该返回结构化输出', async () => {
      const input = { key: 'value', nested: { a: 1 } }
      const result = await SyntheticOutputTool.call(input, {} as any)

      expect(result).toEqual({
        data: 'Structured output provided successfully',
        structured_output: input,
      })
    })

    it('应该处理空输入', async () => {
      const result = await SyntheticOutputTool.call({}, {} as any)

      expect(result.data).toBe('Structured output provided successfully')
      expect(result.structured_output).toEqual({})
    })

    it('应该保留输入数据', async () => {
      const input = {
        name: 'test',
        items: [1, 2, 3],
        nested: { key: 'value' },
      }
      const result = await SyntheticOutputTool.call(input, {} as any)

      expect(result.structured_output).toEqual(input)
    })
  })

  describe('checkPermissions', () => {
    it('应该始终允许', async () => {
      const input = { key: 'value' }
      const result = await SyntheticOutputTool.checkPermissions(input, {} as any)

      expect(result).toEqual({
        behavior: 'allow',
        updatedInput: input,
      })
    })
  })

  describe('渲染函数', () => {
    it('renderToolUseMessage 应该处理空输入', () => {
      expect(SyntheticOutputTool.renderToolUseMessage({})).toBeNull()
    })

    it('renderToolUseMessage 应该处理少量字段', () => {
      const input = { a: 1, b: 2 }
      const result = SyntheticOutputTool.renderToolUseMessage(input)
      expect(result).toContain('a:')
      expect(result).toContain('b:')
    })

    it('renderToolUseMessage 应该处理大量字段', () => {
      const input = { a: 1, b: 2, c: 3, d: 4 }
      const result = SyntheticOutputTool.renderToolUseMessage(input)
      expect(result).toContain('4 fields')
      expect(result).toContain('…')
    })

    it('renderToolUseRejectedMessage 应该返回拒绝消息', () => {
      expect(SyntheticOutputTool.renderToolUseRejectedMessage()).toBe('Structured output rejected')
    })

    it('renderToolUseErrorMessage 应该返回错误消息', () => {
      expect(SyntheticOutputTool.renderToolUseErrorMessage()).toBe('Structured output error')
    })

    it('renderToolUseProgressMessage 应该返回 null', () => {
      expect(SyntheticOutputTool.renderToolUseProgressMessage()).toBeNull()
    })

    it('renderToolResultMessage 应该返回输出内容', () => {
      const output = 'test output'
      expect(SyntheticOutputTool.renderToolResultMessage(output)).toBe(output)
    })
  })

  describe('mapToolResultToToolResultBlockParam', () => {
    it('应该返回 tool_result 格式', () => {
      const content = 'test content'
      const result = SyntheticOutputTool.mapToolResultToToolResultBlockParam(
        content,
        'tool-use-id',
      )

      expect(result).toEqual({
        tool_use_id: 'tool-use-id',
        type: 'tool_result',
        content: 'test content',
      })
    })

    it('应该正确传递内容', () => {
      const content = JSON.stringify({ key: 'value' })
      const result = SyntheticOutputTool.mapToolResultToToolResultBlockParam(
        content,
        'test-id',
      )

      expect(result.content).toBe(content)
    })
  })
})
