import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('src/services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))

vi.mock('src/Task.js', () => ({
  isTerminalTaskStatus: vi.fn((status: string) => status === 'completed' || status === 'failed'),
}))

import {
  enterTeammateView,
  exitTeammateView,
  stopOrDismissAgent,
} from '../../src/state/teammateViewHelpers'

describe('teammateViewHelpers', () => {
  let appState: any
  let setAppState: any

  beforeEach(() => {
    appState = {
      viewingAgentTaskId: undefined,
      viewSelectionMode: 'none',
      tasks: {},
    }
    setAppState = vi.fn((updater: any) => {
      appState = updater(appState)
    })
  })

  describe('enterTeammateView', () => {
    it('设置 viewingAgentTaskId', () => {
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'running',
        retain: false,
      }
      enterTeammateView('task-1', setAppState)
      expect(appState.viewingAgentTaskId).toBe('task-1')
      expect(appState.viewSelectionMode).toBe('viewing-agent')
    })

    it('设置 retain: true', () => {
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'running',
        retain: false,
      }
      enterTeammateView('task-1', setAppState)
      expect(appState.tasks['task-1'].retain).toBe(true)
    })

    it('清除 evictAfter', () => {
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'running',
        retain: false,
        evictAfter: Date.now() + 10000,
      }
      enterTeammateView('task-1', setAppState)
      expect(appState.tasks['task-1'].evictAfter).toBeUndefined()
    })

    it('切换任务时释放前一个', () => {
      appState.viewingAgentTaskId = 'task-1'
      appState.viewSelectionMode = 'viewing-agent'
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'running',
        retain: true,
      }
      appState.tasks['task-2'] = {
        type: 'local_agent',
        status: 'running',
        retain: false,
      }
      enterTeammateView('task-2', setAppState)
      expect(appState.tasks['task-1'].retain).toBe(false)
      expect(appState.tasks['task-2'].retain).toBe(true)
    })
  })

  describe('exitTeammateView', () => {
    it('清除 viewingAgentTaskId', () => {
      appState.viewingAgentTaskId = 'task-1'
      appState.viewSelectionMode = 'viewing-agent'
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'running',
        retain: true,
      }
      exitTeammateView(setAppState)
      expect(appState.viewingAgentTaskId).toBeUndefined()
      expect(appState.viewSelectionMode).toBe('none')
    })

    it('释放任务', () => {
      appState.viewingAgentTaskId = 'task-1'
      appState.viewSelectionMode = 'viewing-agent'
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'running',
        retain: true,
      }
      exitTeammateView(setAppState)
      expect(appState.tasks['task-1'].retain).toBe(false)
    })

    it('无查看任务时不变', () => {
      const originalState = { ...appState }
      exitTeammateView(setAppState)
      expect(appState).toEqual(originalState)
    })
  })

  describe('stopOrDismissAgent', () => {
    it('运行中任务 → abort', () => {
      const abort = vi.fn()
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'running',
        abortController: { abort },
      }
      stopOrDismissAgent('task-1', setAppState)
      expect(abort).toHaveBeenCalled()
    })

    it('已完成任务 → 设置 evictAfter=0', () => {
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'completed',
        retain: false,
      }
      stopOrDismissAgent('task-1', setAppState)
      expect(appState.tasks['task-1'].evictAfter).toBe(0)
    })

    it('查看被 dismiss 的任务 → 退出查看', () => {
      appState.viewingAgentTaskId = 'task-1'
      appState.viewSelectionMode = 'viewing-agent'
      appState.tasks['task-1'] = {
        type: 'local_agent',
        status: 'completed',
        retain: false,
      }
      stopOrDismissAgent('task-1', setAppState)
      expect(appState.viewingAgentTaskId).toBeUndefined()
      expect(appState.viewSelectionMode).toBe('none')
    })

    it('非 local_agent 任务 → 不变', () => {
      appState.tasks['task-1'] = { type: 'other' }
      const originalState = { ...appState }
      stopOrDismissAgent('task-1', setAppState)
      expect(appState).toEqual(originalState)
    })
  })
})
