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

vi.mock('../../../src/utils/tasks.js', () => ({
  getTask: vi.fn(),
  getTaskListId: vi.fn(() => 'test-list-id'),
  isTodoV2Enabled: vi.fn(() => true),
  TaskStatusSchema: vi.fn(() => ({
    enum: vi.fn(),
  })),
}))

vi.mock('./constants.js', () => ({
  TASK_GET_TOOL_NAME: 'TaskGet',
}))

vi.mock('./prompt.js', () => ({
  DESCRIPTION: 'Get a task',
  PROMPT: 'prompt',
}))

// Import after mocks
const { TaskGetTool } = await import('../../../src/tools/TaskGetTool/TaskGetTool.js')

describe('TaskGetTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(TaskGetTool.name).toBe('TaskGet')
    })

    it('应该启用', () => {
      expect(TaskGetTool.isEnabled()).toBe(true)
    })

    it('应该支持并发', () => {
      expect(TaskGetTool.isConcurrencySafe()).toBe(true)
    })

    it('应该是只读的', () => {
      expect(TaskGetTool.isReadOnly()).toBe(true)
    })

    it('应该延迟执行', () => {
      expect(TaskGetTool.shouldDefer).toBe(true)
    })

    it('应该返回正确的用户可见名称', () => {
      expect(TaskGetTool.userFacingName()).toBe('TaskGet')
    })

    it('应该返回 null 用于渲染消息', () => {
      expect(TaskGetTool.renderToolUseMessage()).toBeNull()
    })

    it('应该返回输入任务 ID 用于分类', () => {
      expect(TaskGetTool.toAutoClassifierInput({ taskId: '123' })).toBe('123')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(TaskGetTool.inputSchema).toBeDefined()
    })

    it('应该要求 taskId 字段', () => {
      const schema = TaskGetTool.inputSchema
      expect(schema.shape.taskId).toBeDefined()
    })
  })

  describe('输出模式', () => {
    it('应该定义输出模式', () => {
      expect(TaskGetTool.outputSchema).toBeDefined()
    })

    it('应该包含 task 对象', () => {
      const schema = TaskGetTool.outputSchema
      expect(schema.shape.task).toBeDefined()
    })
  })

  describe('call', () => {
    it('当任务存在时应该返回任务详情', async () => {
      const { getTask } = await import('../../../src/utils/tasks.js')
      const mockTask = {
        id: 'task-123',
        subject: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        blocks: ['task-456'],
        blockedBy: ['task-789'],
      }
      vi.mocked(getTask).mockResolvedValue(mockTask)

      const result = await TaskGetTool.call(
        { taskId: 'task-123' },
        {} as any,
      )

      expect(getTask).toHaveBeenCalledWith('test-list-id', 'task-123')
      expect(result).toEqual({
        data: {
          task: {
            id: 'task-123',
            subject: 'Test Task',
            description: 'Test Description',
            status: 'pending',
            blocks: ['task-456'],
            blockedBy: ['task-789'],
          },
        },
      })
    })

    it('当任务不存在时应该返回 null', async () => {
      const { getTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue(null)

      const result = await TaskGetTool.call(
        { taskId: 'non-existent' },
        {} as any,
      )

      expect(result).toEqual({
        data: {
          task: null,
        },
      })
    })
  })

  describe('mapToolResultToToolResultBlockParam', () => {
    it('当任务不存在时应该返回 "Task not found"', () => {
      const result = TaskGetTool.mapToolResultToToolResultBlockParam(
        { task: null } as any,
        'tool-use-id',
      )

      expect(result).toEqual({
        tool_use_id: 'tool-use-id',
        type: 'tool_result',
        content: 'Task not found',
      })
    })

    it('当任务存在时应该返回格式化的任务信息', () => {
      const task = {
        id: 'task-123',
        subject: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        blocks: ['task-456'],
        blockedBy: ['task-789'],
      }

      const result = TaskGetTool.mapToolResultToToolResultBlockParam(
        { task } as any,
        'tool-use-id',
      )

      expect(result.tool_use_id).toBe('tool-use-id')
      expect(result.type).toBe('tool_result')
      expect(result.content).toContain('Task #task-123: Test Task')
      expect(result.content).toContain('Status: pending')
      expect(result.content).toContain('Description: Test Description')
      expect(result.content).toContain('Blocked by: #task-789')
      expect(result.content).toContain('Blocks: #task-456')
    })

    it('当没有 blocks 和 blockedBy 时应该省略这些行', () => {
      const task = {
        id: 'task-123',
        subject: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        blocks: [],
        blockedBy: [],
      }

      const result = TaskGetTool.mapToolResultToToolResultBlockParam(
        { task } as any,
        'tool-use-id',
      )

      expect(result.content).not.toContain('Blocked by')
      expect(result.content).not.toContain('Blocks')
    })
  })
})
