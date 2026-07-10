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
  getTaskListId: vi.fn(() => 'test-list-id'),
  isTodoV2Enabled: vi.fn(() => true),
  listTasks: vi.fn(),
  TaskStatusSchema: vi.fn(() => ({
    enum: vi.fn(),
  })),
}))

vi.mock('./constants.js', () => ({
  TASK_LIST_TOOL_NAME: 'TaskList',
}))

vi.mock('./prompt.js', () => ({
  DESCRIPTION: 'List tasks',
  getPrompt: vi.fn(() => 'prompt'),
}))

// Import after mocks
const { TaskListTool } = await import('../../../src/tools/TaskListTool/TaskListTool.js')

describe('TaskListTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(TaskListTool.name).toBe('TaskList')
    })

    it('应该启用', () => {
      expect(TaskListTool.isEnabled()).toBe(true)
    })

    it('应该支持并发', () => {
      expect(TaskListTool.isConcurrencySafe()).toBe(true)
    })

    it('应该是只读的', () => {
      expect(TaskListTool.isReadOnly()).toBe(true)
    })

    it('应该延迟执行', () => {
      expect(TaskListTool.shouldDefer).toBe(true)
    })

    it('应该返回正确的用户可见名称', () => {
      expect(TaskListTool.userFacingName()).toBe('TaskList')
    })

    it('应该返回 null 用于渲染消息', () => {
      expect(TaskListTool.renderToolUseMessage()).toBeNull()
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(TaskListTool.inputSchema).toBeDefined()
    })

    it('应该是空对象', () => {
      const schema = TaskListTool.inputSchema
      expect(Object.keys(schema.shape)).toHaveLength(0)
    })
  })

  describe('输出模式', () => {
    it('应该定义输出模式', () => {
      expect(TaskListTool.outputSchema).toBeDefined()
    })

    it('应该包含 tasks 数组', () => {
      const schema = TaskListTool.outputSchema
      expect(schema.shape.tasks).toBeDefined()
    })
  })

  describe('call', () => {
    it('应该返回任务列表', async () => {
      const { listTasks } = await import('../../../src/utils/tasks.js')
      const mockTasks = [
        {
          id: 'task-1',
          subject: 'Task 1',
          status: 'pending',
          owner: undefined,
          blocks: [],
          blockedBy: [],
          metadata: undefined,
        },
        {
          id: 'task-2',
          subject: 'Task 2',
          status: 'in_progress',
          owner: 'agent-1',
          blocks: ['task-3'],
          blockedBy: [],
          metadata: undefined,
        },
      ]
      vi.mocked(listTasks).mockResolvedValue(mockTasks)

      const result = await TaskListTool.call({}, {} as any)

      expect(listTasks).toHaveBeenCalledWith('test-list-id')
      expect(result).toEqual({
        data: {
          tasks: [
            {
              id: 'task-1',
              subject: 'Task 1',
              status: 'pending',
              owner: undefined,
              blockedBy: [],
            },
            {
              id: 'task-2',
              subject: 'Task 2',
              status: 'in_progress',
              owner: 'agent-1',
              blockedBy: [],
            },
          ],
        },
      })
    })

    it('应该过滤掉内部任务', async () => {
      const { listTasks } = await import('../../../src/utils/tasks.js')
      const mockTasks = [
        {
          id: 'task-1',
          subject: 'Task 1',
          status: 'pending',
          owner: undefined,
          blocks: [],
          blockedBy: [],
          metadata: undefined,
        },
        {
          id: 'task-internal',
          subject: 'Internal Task',
          status: 'pending',
          owner: undefined,
          blocks: [],
          blockedBy: [],
          metadata: { _internal: true },
        },
      ]
      vi.mocked(listTasks).mockResolvedValue(mockTasks)

      const result = await TaskListTool.call({}, {} as any)

      expect(result.data.tasks).toHaveLength(1)
      expect(result.data.tasks[0].id).toBe('task-1')
    })

    it('应该过滤掉已完成任务的 blockedBy', async () => {
      const { listTasks } = await import('../../../src/utils/tasks.js')
      const mockTasks = [
        {
          id: 'task-1',
          subject: 'Task 1',
          status: 'completed',
          owner: undefined,
          blocks: [],
          blockedBy: [],
          metadata: undefined,
        },
        {
          id: 'task-2',
          subject: 'Task 2',
          status: 'pending',
          owner: undefined,
          blocks: [],
          blockedBy: ['task-1'],
          metadata: undefined,
        },
      ]
      vi.mocked(listTasks).mockResolvedValue(mockTasks)

      const result = await TaskListTool.call({}, {} as any)

      expect(result.data.tasks[1].blockedBy).toHaveLength(0)
    })

    it('应该保留未完成的 blockedBy', async () => {
      const { listTasks } = await import('../../../src/utils/tasks.js')
      const mockTasks = [
        {
          id: 'task-1',
          subject: 'Task 1',
          status: 'pending',
          owner: undefined,
          blocks: [],
          blockedBy: ['task-3'],
          metadata: undefined,
        },
        {
          id: 'task-2',
          subject: 'Task 2',
          status: 'pending',
          owner: undefined,
          blocks: [],
          blockedBy: ['task-1'],
          metadata: undefined,
        },
      ]
      vi.mocked(listTasks).mockResolvedValue(mockTasks)

      const result = await TaskListTool.call({}, {} as any)

      expect(result.data.tasks[0].blockedBy).toEqual(['task-3'])
      expect(result.data.tasks[1].blockedBy).toEqual(['task-1'])
    })
  })

  describe('mapToolResultToToolResultBlockParam', () => {
    it('当没有任务时应该返回 "No tasks found"', () => {
      const result = TaskListTool.mapToolResultToToolResultBlockParam(
        { tasks: [] } as any,
        'tool-use-id',
      )

      expect(result).toEqual({
        tool_use_id: 'tool-use-id',
        type: 'tool_result',
        content: 'No tasks found',
      })
    })

    it('应该格式化任务列表', () => {
      const tasks = [
        {
          id: 'task-1',
          subject: 'Task 1',
          status: 'pending',
          owner: undefined,
          blockedBy: [],
        },
        {
          id: 'task-2',
          subject: 'Task 2',
          status: 'in_progress',
          owner: 'agent-1',
          blockedBy: ['task-1'],
        },
      ]

      const result = TaskListTool.mapToolResultToToolResultBlockParam(
        { tasks } as any,
        'tool-use-id',
      )

      expect(result.tool_use_id).toBe('tool-use-id')
      expect(result.type).toBe('tool_result')
      expect(result.content).toContain('#task-1 [pending] Task 1')
      expect(result.content).toContain('#task-2 [in_progress] Task 2 (agent-1)')
      expect(result.content).toContain('[blocked by #task-1]')
    })

    it('应该处理没有 owner 和 blockedBy 的情况', () => {
      const tasks = [
        {
          id: 'task-1',
          subject: 'Task 1',
          status: 'pending',
          owner: undefined,
          blockedBy: [],
        },
      ]

      const result = TaskListTool.mapToolResultToToolResultBlockParam(
        { tasks } as any,
        'tool-use-id',
      )

      expect(result.content).toBe('#task-1 [pending] Task 1')
    })
  })
})
