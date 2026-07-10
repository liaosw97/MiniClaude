import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../../src/Tool.js', () => ({
  buildTool: vi.fn((config: any) => config),
}))

vi.mock('../../../src/utils/hooks.js', () => ({
  executeTaskCreatedHooks: vi.fn(async function* () {
    // 空的异步生成器
  }),
  getTaskCreatedHookMessage: vi.fn(),
}))

vi.mock('../../../src/utils/lazySchema.js', () => ({
  lazySchema: vi.fn((fn: () => any) => {
    // 返回一个函数，调用时返回 fn() 的结果
    const result = fn()
    return () => result
  }),
}))

vi.mock('../../../src/utils/tasks.js', () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  getTaskListId: vi.fn(() => 'test-list-id'),
  isTodoV2Enabled: vi.fn(() => true),
}))

vi.mock('../../../src/utils/teammate.js', () => ({
  getAgentName: vi.fn(() => 'test-agent'),
  getTeamName: vi.fn(() => 'test-team'),
}))

vi.mock('./constants.js', () => ({
  TASK_CREATE_TOOL_NAME: 'TaskCreate',
}))

vi.mock('./prompt.js', () => ({
  DESCRIPTION: 'Create a task',
  getPrompt: vi.fn(() => 'prompt'),
}))

// Import after mocks
const { TaskCreateTool } = await import('../../../src/tools/TaskCreateTool/TaskCreateTool.js')

describe('TaskCreateTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(TaskCreateTool.name).toBe('TaskCreate')
    })

    it('应该启用', () => {
      expect(TaskCreateTool.isEnabled()).toBe(true)
    })

    it('应该支持并发', () => {
      expect(TaskCreateTool.isConcurrencySafe()).toBe(true)
    })

    it('应该延迟执行', () => {
      expect(TaskCreateTool.shouldDefer).toBe(true)
    })

    it('应该返回正确的用户可见名称', () => {
      expect(TaskCreateTool.userFacingName()).toBe('TaskCreate')
    })

    it('应该返回 null 用于渲染消息', () => {
      expect(TaskCreateTool.renderToolUseMessage()).toBeNull()
    })

    it('应该返回输入主题用于分类', () => {
      expect(TaskCreateTool.toAutoClassifierInput({ subject: 'test' })).toBe('test')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(TaskCreateTool.inputSchema).toBeDefined()
    })

    it('应该要求 subject 字段', () => {
      const schema = TaskCreateTool.inputSchema
      expect(schema.shape.subject).toBeDefined()
    })

    it('应该要求 description 字段', () => {
      const schema = TaskCreateTool.inputSchema
      expect(schema.shape.description).toBeDefined()
    })

    it('activeForm 应该是可选的', () => {
      const schema = TaskCreateTool.inputSchema
      expect(schema.shape.activeForm).toBeDefined()
    })

    it('metadata 应该是可选的', () => {
      const schema = TaskCreateTool.inputSchema
      expect(schema.shape.metadata).toBeDefined()
    })
  })

  describe('输出模式', () => {
    it('应该定义输出模式', () => {
      expect(TaskCreateTool.outputSchema).toBeDefined()
    })

    it('应该包含 task 对象', () => {
      const schema = TaskCreateTool.outputSchema
      expect(schema.shape.task).toBeDefined()
    })

    it('task 应该包含 id', () => {
      const schema = TaskCreateTool.outputSchema
      expect(schema.shape.task.shape.id).toBeDefined()
    })

    it('task 应该包含 subject', () => {
      const schema = TaskCreateTool.outputSchema
      expect(schema.shape.task.shape.subject).toBeDefined()
    })
  })

  describe('call', () => {
    const mockContext = {
      setAppState: vi.fn(),
      abortController: {
        signal: new AbortController().signal,
      },
    }

    it('应该调用 createTask', async () => {
      const { createTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(createTask).mockResolvedValue('task-123')

      const result = await TaskCreateTool.call(
        {
          subject: 'Test Task',
          description: 'Test Description',
        },
        mockContext as any,
      )

      expect(createTask).toHaveBeenCalledWith('test-list-id', {
        subject: 'Test Task',
        description: 'Test Description',
        activeForm: undefined,
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: undefined,
      })

      expect(result).toEqual({
        data: {
          task: {
            id: 'task-123',
            subject: 'Test Task',
          },
        },
      })
    })

    it('应该处理 activeForm 参数', async () => {
      const { createTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(createTask).mockResolvedValue('task-456')

      await TaskCreateTool.call(
        {
          subject: 'Test Task',
          description: 'Test Description',
          activeForm: 'Running tests',
        },
        mockContext as any,
      )

      expect(createTask).toHaveBeenCalledWith('test-list-id', expect.objectContaining({
        activeForm: 'Running tests',
      }))
    })

    it('应该处理 metadata 参数', async () => {
      const { createTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(createTask).mockResolvedValue('task-789')

      await TaskCreateTool.call(
        {
          subject: 'Test Task',
          description: 'Test Description',
          metadata: { key: 'value' },
        },
        mockContext as any,
      )

      expect(createTask).toHaveBeenCalledWith('test-list-id', expect.objectContaining({
        metadata: { key: 'value' },
      }))
    })
  })
})
