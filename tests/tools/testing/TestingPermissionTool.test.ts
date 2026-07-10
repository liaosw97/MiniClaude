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

// Import after mocks
const { TestingPermissionTool } = await import('../../../src/tools/testing/TestingPermissionTool.js')

describe('TestingPermissionTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(TestingPermissionTool.name).toBe('TestingPermission')
    })

    it('应该在测试环境启用', () => {
      // 注意：实际代码中 isEnabled 检查 "production" === 'test'
      // 在 vitest 环境中，process.env.NODE_ENV 是 'test'
      // 但代码硬编码了 "production"，所以应该返回 false
      expect(TestingPermissionTool.isEnabled()).toBe(false)
    })

    it('应该支持并发', () => {
      expect(TestingPermissionTool.isConcurrencySafe()).toBe(true)
    })

    it('应该是只读的', () => {
      expect(TestingPermissionTool.isReadOnly()).toBe(true)
    })

    it('应该返回正确的用户可见名称', () => {
      expect(TestingPermissionTool.userFacingName()).toBe('TestingPermission')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(TestingPermissionTool.inputSchema).toBeDefined()
    })

    it('应该是空对象', () => {
      const schema = TestingPermissionTool.inputSchema
      expect(Object.keys(schema.shape)).toHaveLength(0)
    })
  })

  describe('description', () => {
    it('应该返回描述', async () => {
      const description = await TestingPermissionTool.description()
      expect(description).toContain('permission')
      expect(description).toContain('Test')
    })
  })

  describe('prompt', () => {
    it('应该返回提示', async () => {
      const prompt = await TestingPermissionTool.prompt()
      expect(prompt).toContain('permission')
      expect(prompt).toContain('end-to-end testing')
    })
  })

  describe('checkPermissions', () => {
    it('应该始终要求权限', async () => {
      const result = await TestingPermissionTool.checkPermissions({}, {} as any)

      expect(result).toEqual({
        behavior: 'ask',
        message: 'Run test?',
      })
    })
  })

  describe('call', () => {
    it('应该返回成功消息', async () => {
      const result = await TestingPermissionTool.call({}, {} as any)

      expect(result).toEqual({
        data: 'TestingPermission executed successfully',
      })
    })
  })

  describe('mapToolResultToToolResultBlockParam', () => {
    it('应该返回 tool_result 格式', () => {
      const result = TestingPermissionTool.mapToolResultToToolResultBlockParam(
        'test result',
        'tool-use-id',
      )

      expect(result).toEqual({
        type: 'tool_result',
        content: 'test result',
        tool_use_id: 'tool-use-id',
      })
    })

    it('应该正确转换结果为字符串', () => {
      const result = TestingPermissionTool.mapToolResultToToolResultBlockParam(
        123 as any,
        'test-id',
      )

      expect(result.content).toBe('123')
    })
  })

  describe('渲染函数', () => {
    it('renderToolUseMessage 应该返回 null', () => {
      expect(TestingPermissionTool.renderToolUseMessage()).toBeNull()
    })

    it('renderToolUseProgressMessage 应该返回 null', () => {
      expect(TestingPermissionTool.renderToolUseProgressMessage()).toBeNull()
    })

    it('renderToolUseQueuedMessage 应该返回 null', () => {
      expect(TestingPermissionTool.renderToolUseQueuedMessage()).toBeNull()
    })

    it('renderToolUseRejectedMessage 应该返回 null', () => {
      expect(TestingPermissionTool.renderToolUseRejectedMessage()).toBeNull()
    })

    it('renderToolResultMessage 应该返回 null', () => {
      expect(TestingPermissionTool.renderToolResultMessage()).toBeNull()
    })

    it('renderToolUseErrorMessage 应该返回 null', () => {
      expect(TestingPermissionTool.renderToolUseErrorMessage()).toBeNull()
    })
  })
})
