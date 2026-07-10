import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('src/tasks/InProcessTeammateTask/types.js', () => ({
  isInProcessTeammateTask: vi.fn((task: any) => task?.type === 'in_process_teammate'),
}))

vi.mock('src/tasks/LocalAgentTask/LocalAgentTask.js', () => ({}))

import {
  getViewedTeammateTask,
  getActiveAgentForInput,
} from '../../src/state/selectors'

describe('selectors', () => {
  describe('getViewedTeammateTask', () => {
    it('无 viewingAgentTaskId → undefined', () => {
      const state = {
        viewingAgentTaskId: undefined,
        tasks: {},
      }
      expect(getViewedTeammateTask(state)).toBeUndefined()
    })

    it('任务不存在 → undefined', () => {
      const state = {
        viewingAgentTaskId: 'task-1',
        tasks: {},
      }
      expect(getViewedTeammateTask(state)).toBeUndefined()
    })

    it('任务不是 in-process teammate → undefined', () => {
      const state = {
        viewingAgentTaskId: 'task-1',
        tasks: {
          'task-1': { type: 'other' },
        },
      }
      expect(getViewedTeammateTask(state)).toBeUndefined()
    })

    it('有效的 teammate 任务 → 返回任务', () => {
      const task = { type: 'in_process_teammate', id: 'task-1' }
      const state = {
        viewingAgentTaskId: 'task-1',
        tasks: {
          'task-1': task,
        },
      }
      expect(getViewedTeammateTask(state)).toBe(task)
    })
  })

  describe('getActiveAgentForInput', () => {
    it('无查看任务 → leader', () => {
      const state = {
        viewingAgentTaskId: undefined,
        tasks: {},
      } as any
      expect(getActiveAgentForInput(state)).toEqual({ type: 'leader' })
    })

    it('查看 teammate 任务 → viewed', () => {
      const task = { type: 'in_process_teammate', id: 'task-1' }
      const state = {
        viewingAgentTaskId: 'task-1',
        tasks: {
          'task-1': task,
        },
      } as any
      const result = getActiveAgentForInput(state)
      expect(result.type).toBe('viewed')
      if (result.type === 'viewed') {
        expect(result.task).toBe(task)
      }
    })

    it('查看 local_agent 任务 → named_agent', () => {
      const task = { type: 'local_agent', id: 'task-1' }
      const state = {
        viewingAgentTaskId: 'task-1',
        tasks: {
          'task-1': task,
        },
      } as any
      const result = getActiveAgentForInput(state)
      expect(result.type).toBe('named_agent')
      if (result.type === 'named_agent') {
        expect(result.task).toBe(task)
      }
    })

    it('查看不存在的任务 → leader', () => {
      const state = {
        viewingAgentTaskId: 'task-1',
        tasks: {},
      } as any
      expect(getActiveAgentForInput(state)).toEqual({ type: 'leader' })
    })
  })
})
