import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('bun:bundle', () => ({
  feature: vi.fn(() => false),
}))

vi.mock('../../../src/services/analytics/growthbook.js', () => ({
  getFeatureValue_CACHED_MAY_BE_STALE: vi.fn(() => false),
}))

vi.mock('../../../src/Tool.js', () => ({
  buildTool: vi.fn((config: any) => config),
}))

vi.mock('../../../src/utils/agentSwarmsEnabled.js', () => ({
  isAgentSwarmsEnabled: vi.fn(() => false),
}))

vi.mock('../../../src/utils/hooks.js', () => ({
  executeTaskCompletedHooks: vi.fn(async function* () {}),
  getTaskCompletedHookMessage: vi.fn(),
}))

vi.mock('../../../src/utils/lazySchema.js', () => ({
  lazySchema: vi.fn((fn: () => any) => {
    const result = fn()
    return () => result
  }),
}))

vi.mock('../../../src/utils/tasks.js', () => ({
  blockTask: vi.fn(),
  deleteTask: vi.fn(),
  getTask: vi.fn(),
  getTaskListId: vi.fn(() => 'test-list-id'),
  isTodoV2Enabled: vi.fn(() => true),
  listTasks: vi.fn(),
  TaskStatusSchema: vi.fn(() => {
    const schema = {
      enum: vi.fn(),
      optional: vi.fn(() => schema),
      describe: vi.fn(() => schema),
      or: vi.fn(() => schema),
    }
    return schema
  }),
  updateTask: vi.fn(),
}))

vi.mock('../../../src/utils/teammate.js', () => ({
  getAgentId: vi.fn(),
  getAgentName: vi.fn(),
  getTeammateColor: vi.fn(),
  getTeamName: vi.fn(),
}))

vi.mock('../../../src/utils/teammateMailbox.js', () => ({
  writeToMailbox: vi.fn(),
}))

vi.mock('../AgentTool/constants.js', () => ({
  VERIFICATION_AGENT_TYPE: 'verification',
}))

vi.mock('./constants.js', () => ({
  TASK_UPDATE_TOOL_NAME: 'TaskUpdate',
}))

vi.mock('./prompt.js', () => ({
  DESCRIPTION: 'Update a task',
  PROMPT: 'prompt',
}))

// Import after mocks
const { TaskUpdateTool } = await import('../../../src/tools/TaskUpdateTool/TaskUpdateTool.js')

describe('TaskUpdateTool', () => {
  const mockContext = {
    setAppState: vi.fn(),
    abortController: {
      signal: new AbortController().signal,
    },
    agentId: undefined,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(TaskUpdateTool.name).toBe('TaskUpdate')
    })

    it('应该启用', () => {
      expect(TaskUpdateTool.isEnabled()).toBe(true)
    })

    it('应该支持并发', () => {
      expect(TaskUpdateTool.isConcurrencySafe()).toBe(true)
    })

    it('应该延迟执行', () => {
      expect(TaskUpdateTool.shouldDefer).toBe(true)
    })

    it('应该返回正确的用户可见名称', () => {
      expect(TaskUpdateTool.userFacingName()).toBe('TaskUpdate')
    })

    it('应该返回 null 用于渲染消息', () => {
      expect(TaskUpdateTool.renderToolUseMessage()).toBeNull()
    })

    it('应该返回输入用于分类', () => {
      expect(TaskUpdateTool.toAutoClassifierInput({ taskId: '123', status: 'completed' })).toBe('123 completed')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(TaskUpdateTool.inputSchema).toBeDefined()
    })

    it('应该要求 taskId 字段', () => {
      const schema = TaskUpdateTool.inputSchema
      expect(schema.shape.taskId).toBeDefined()
    })

    it('应该有可选的 subject 字段', () => {
      const schema = TaskUpdateTool.inputSchema
      expect(schema.shape.subject).toBeDefined()
    })

    it('应该有可选的 status 字段', () => {
      const schema = TaskUpdateTool.inputSchema
      expect(schema.shape.status).toBeDefined()
    })

    it('应该有可选的 addBlocks 字段', () => {
      const schema = TaskUpdateTool.inputSchema
      expect(schema.shape.addBlocks).toBeDefined()
    })

    it('应该有可选的 addBlockedBy 字段', () => {
      const schema = TaskUpdateTool.inputSchema
      expect(schema.shape.addBlockedBy).toBeDefined()
    })
  })

  describe('输出模式', () => {
    it('应该定义输出模式', () => {
      expect(TaskUpdateTool.outputSchema).toBeDefined()
    })

    it('应该包含 success 字段', () => {
      const schema = TaskUpdateTool.outputSchema
      expect(schema.shape.success).toBeDefined()
    })

    it('应该包含 taskId 字段', () => {
      const schema = TaskUpdateTool.outputSchema
      expect(schema.shape.taskId).toBeDefined()
    })

    it('应该包含 updatedFields 字段', () => {
      const schema = TaskUpdateTool.outputSchema
      expect(schema.shape.updatedFields).toBeDefined()
    })
  })

  describe('call', () => {
    it('当任务不存在时应该返回失败', async () => {
      const { getTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue(null)

      const result = await TaskUpdateTool.call(
        { taskId: 'non-existent' },
        mockContext as any,
      )

      expect(result).toEqual({
        data: {
          success: false,
          taskId: 'non-existent',
          updatedFields: [],
          error: 'Task not found',
        },
      })
    })

    it('应该更新 subject', async () => {
      const { getTask, updateTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue({
        id: 'task-123',
        subject: 'Old Subject',
        description: 'Description',
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: undefined,
      })

      const result = await TaskUpdateTool.call(
        { taskId: 'task-123', subject: 'New Subject' },
        mockContext as any,
      )

      expect(updateTask).toHaveBeenCalledWith('test-list-id', 'task-123', {
        subject: 'New Subject',
      })
      expect(result.data.success).toBe(true)
      expect(result.data.updatedFields).toContain('subject')
    })

    it('应该更新 status', async () => {
      const { getTask, updateTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue({
        id: 'task-123',
        subject: 'Task',
        description: 'Description',
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: undefined,
      })

      const result = await TaskUpdateTool.call(
        { taskId: 'task-123', status: 'in_progress' },
        mockContext as any,
      )

      expect(updateTask).toHaveBeenCalledWith('test-list-id', 'task-123', {
        status: 'in_progress',
      })
      expect(result.data.success).toBe(true)
      expect(result.data.updatedFields).toContain('status')
      expect(result.data.statusChange).toEqual({
        from: 'pending',
        to: 'in_progress',
      })
    })

    it('应该删除任务', async () => {
      const { getTask, deleteTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue({
        id: 'task-123',
        subject: 'Task',
        description: 'Description',
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: undefined,
      })
      vi.mocked(deleteTask).mockResolvedValue(true)

      const result = await TaskUpdateTool.call(
        { taskId: 'task-123', status: 'deleted' },
        mockContext as any,
      )

      expect(deleteTask).toHaveBeenCalledWith('test-list-id', 'task-123')
      expect(result.data.success).toBe(true)
      expect(result.data.updatedFields).toEqual(['deleted'])
      expect(result.data.statusChange).toEqual({
        from: 'pending',
        to: 'deleted',
      })
    })

    it('应该添加 blocks', async () => {
      const { getTask, blockTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue({
        id: 'task-123',
        subject: 'Task',
        description: 'Description',
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: undefined,
      })

      const result = await TaskUpdateTool.call(
        { taskId: 'task-123', addBlocks: ['task-456'] },
        mockContext as any,
      )

      expect(blockTask).toHaveBeenCalledWith('test-list-id', 'task-123', 'task-456')
      expect(result.data.success).toBe(true)
      expect(result.data.updatedFields).toContain('blocks')
    })

    it('应该添加 blockedBy', async () => {
      const { getTask, blockTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue({
        id: 'task-123',
        subject: 'Task',
        description: 'Description',
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: undefined,
      })

      const result = await TaskUpdateTool.call(
        { taskId: 'task-123', addBlockedBy: ['task-789'] },
        mockContext as any,
      )

      expect(blockTask).toHaveBeenCalledWith('test-list-id', 'task-789', 'task-123')
      expect(result.data.success).toBe(true)
      expect(result.data.updatedFields).toContain('blockedBy')
    })

    it('应该更新 metadata', async () => {
      const { getTask, updateTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue({
        id: 'task-123',
        subject: 'Task',
        description: 'Description',
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: { existing: 'value' },
      })

      const result = await TaskUpdateTool.call(
        { taskId: 'task-123', metadata: { new: 'data' } },
        mockContext as any,
      )

      expect(updateTask).toHaveBeenCalledWith('test-list-id', 'task-123', {
        metadata: { existing: 'value', new: 'data' },
      })
      expect(result.data.success).toBe(true)
      expect(result.data.updatedFields).toContain('metadata')
    })

    it('应该删除 metadata 键', async () => {
      const { getTask, updateTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue({
        id: 'task-123',
        subject: 'Task',
        description: 'Description',
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: { toDelete: 'value', toKeep: 'value' },
      })

      const result = await TaskUpdateTool.call(
        { taskId: 'task-123', metadata: { toDelete: null } },
        mockContext as any,
      )

      expect(updateTask).toHaveBeenCalledWith('test-list-id', 'task-123', {
        metadata: { toKeep: 'value' },
      })
      expect(result.data.success).toBe(true)
    })

    it('当值未改变时不应该更新字段', async () => {
      const { getTask, updateTask } = await import('../../../src/utils/tasks.js')
      vi.mocked(getTask).mockResolvedValue({
        id: 'task-123',
        subject: 'Task',
        description: 'Description',
        status: 'pending',
        owner: undefined,
        blocks: [],
        blockedBy: [],
        metadata: undefined,
      })

      const result = await TaskUpdateTool.call(
        { taskId: 'task-123', subject: 'Task' },
        mockContext as any,
      )

      expect(updateTask).not.toHaveBeenCalled()
      expect(result.data.success).toBe(true)
      expect(result.data.updatedFields).toHaveLength(0)
    })
  })

  describe('mapToolResultToToolResultBlockParam', () => {
    it('当更新失败时应该返回错误消息', () => {
      const result = TaskUpdateTool.mapToolResultToToolResultBlockParam(
        {
          success: false,
          taskId: 'task-123',
          updatedFields: [],
          error: 'Task not found',
        } as any,
        'tool-use-id',
      )

      expect(result).toEqual({
        tool_use_id: 'tool-use-id',
        type: 'tool_result',
        content: 'Task not found',
      })
    })

    it('当更新成功时应该返回成功消息', () => {
      const result = TaskUpdateTool.mapToolResultToToolResultBlockParam(
        {
          success: true,
          taskId: 'task-123',
          updatedFields: ['subject', 'status'],
        } as any,
        'tool-use-id',
      )

      expect(result.tool_use_id).toBe('tool-use-id')
      expect(result.type).toBe('tool_result')
      expect(result.content).toContain('Updated task #task-123')
      expect(result.content).toContain('subject')
      expect(result.content).toContain('status')
    })

    it('当没有错误时应该使用默认消息', () => {
      const result = TaskUpdateTool.mapToolResultToToolResultBlockParam(
        {
          success: false,
          taskId: 'task-123',
          updatedFields: [],
        } as any,
        'tool-use-id',
      )

      expect(result.content).toBe('Task #task-123 not found')
    })
  })
})
