import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock figures module
vi.mock('figures', () => ({
  default: {
    cross: '✘',
    questionMarkPrefix: '?',
    warning: '⚠',
    ellipsis: '…',
    play: '▶',
    tick: '✔',
    bullet: '●',
  },
}))

// Mock dependencies
vi.mock('src/tasks/LocalAgentTask/LocalAgentTask.js', () => ({
  isPanelAgentTask: vi.fn((task: any) => task.type === 'panel_agent'),
}))

vi.mock('src/tasks/types.js', () => ({
  isBackgroundTask: vi.fn((task: any) => task.type === 'background' || task.type === 'in_process_teammate'),
}))

vi.mock('src/utils/collapseReadSearch.js', () => ({
  summarizeRecentActivities: vi.fn((activities: any[]) =>
    activities.length > 0 ? activities[0]?.activityDescription ?? 'active' : undefined
  ),
}))

// Import after mocks
const {
  isTerminalStatus,
  getTaskStatusIcon,
  getTaskStatusColor,
  describeTeammateActivity,
  shouldHideTasksFooter,
} = await import('../../src/components/tasks/taskStatusUtils.js')

describe('taskStatusUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isTerminalStatus', () => {
    it('当 status 为 completed 时应该返回 true', () => {
      expect(isTerminalStatus('completed')).toBe(true)
    })

    it('当 status 为 failed 时应该返回 true', () => {
      expect(isTerminalStatus('failed')).toBe(true)
    })

    it('当 status 为 killed 时应该返回 true', () => {
      expect(isTerminalStatus('killed')).toBe(true)
    })

    it('当 status 为 running 时应该返回 false', () => {
      expect(isTerminalStatus('running')).toBe(false)
    })

    it('当 status 为 pending 时应该返回 false', () => {
      expect(isTerminalStatus('pending')).toBe(false)
    })
  })

  describe('getTaskStatusIcon', () => {
    it('当 hasError 为 true 时应该返回 cross 图标', () => {
      expect(getTaskStatusIcon('running', { hasError: true })).toBe('✘')
    })

    it('当 awaitingApproval 为 true 时应该返回 questionMarkPrefix 图标', () => {
      expect(getTaskStatusIcon('running', { awaitingApproval: true })).toBe('?')
    })

    it('当 shutdownRequested 为 true 时应该返回 warning 图标', () => {
      expect(getTaskStatusIcon('running', { shutdownRequested: true })).toBe('⚠')
    })

    it('当 status 为 running 且 isIdle 为 true 时应该返回 ellipsis 图标', () => {
      expect(getTaskStatusIcon('running', { isIdle: true })).toBe('…')
    })

    it('当 status 为 running 且无特殊标志时应该返回 play 图标', () => {
      expect(getTaskStatusIcon('running')).toBe('▶')
    })

    it('当 status 为 completed 时应该返回 tick 图标', () => {
      expect(getTaskStatusIcon('completed')).toBe('✔')
    })

    it('当 status 为 failed 时应该返回 cross 图标', () => {
      expect(getTaskStatusIcon('failed')).toBe('✘')
    })

    it('当 status 为 killed 时应该返回 cross 图标', () => {
      expect(getTaskStatusIcon('killed')).toBe('✘')
    })

    it('当 status 为其他值时应该返回 bullet 图标', () => {
      expect(getTaskStatusIcon('pending')).toBe('●')
    })

    it('应该优先返回 hasError 图标', () => {
      expect(getTaskStatusIcon('completed', { hasError: true, awaitingApproval: true })).toBe('✘')
    })
  })

  describe('getTaskStatusColor', () => {
    it('当 hasError 为 true 时应该返回 error', () => {
      expect(getTaskStatusColor('running', { hasError: true })).toBe('error')
    })

    it('当 awaitingApproval 为 true 时应该返回 warning', () => {
      expect(getTaskStatusColor('running', { awaitingApproval: true })).toBe('warning')
    })

    it('当 shutdownRequested 为 true 时应该返回 warning', () => {
      expect(getTaskStatusColor('running', { shutdownRequested: true })).toBe('warning')
    })

    it('当 isIdle 为 true 时应该返回 background', () => {
      expect(getTaskStatusColor('running', { isIdle: true })).toBe('background')
    })

    it('当 status 为 completed 时应该返回 success', () => {
      expect(getTaskStatusColor('completed')).toBe('success')
    })

    it('当 status 为 failed 时应该返回 error', () => {
      expect(getTaskStatusColor('failed')).toBe('error')
    })

    it('当 status 为 killed 时应该返回 warning', () => {
      expect(getTaskStatusColor('killed')).toBe('warning')
    })

    it('当 status 为 running 且无特殊标志时应该返回 background', () => {
      expect(getTaskStatusColor('running')).toBe('background')
    })

    it('应该优先返回 hasError 颜色', () => {
      expect(getTaskStatusColor('completed', { hasError: true })).toBe('error')
    })
  })

  describe('describeTeammateActivity', () => {
    it('当 shutdownRequested 为 true 时应该返回 stopping', () => {
      const state = { shutdownRequested: true } as any
      expect(describeTeammateActivity(state)).toBe('stopping')
    })

    it('当 awaitingPlanApproval 为 true 时应该返回 awaiting approval', () => {
      const state = { awaitingPlanApproval: true } as any
      expect(describeTeammateActivity(state)).toBe('awaiting approval')
    })

    it('当 isIdle 为 true 时应该返回 idle', () => {
      const state = { isIdle: true } as any
      expect(describeTeammateActivity(state)).toBe('idle')
    })

    it('当有 recentActivities 时应该返回摘要', () => {
      const state = {
        progress: {
          recentActivities: [{ activityDescription: 'reading files' }],
        },
      } as any
      expect(describeTeammateActivity(state)).toBe('reading files')
    })

    it('当有 lastActivity 时应该返回活动描述', () => {
      const state = {
        progress: {
          lastActivity: { activityDescription: 'writing code' },
        },
      } as any
      expect(describeTeammateActivity(state)).toBe('writing code')
    })

    it('当没有活动信息时应该返回 working', () => {
      const state = { progress: null } as any
      expect(describeTeammateActivity(state)).toBe('working')
    })
  })

  describe('shouldHideTasksFooter', () => {
    it('当 showSpinnerTree 为 false 时应该返回 false', () => {
      expect(shouldHideTasksFooter({}, false)).toBe(false)
    })

    it('当没有可见任务时应该返回 false', () => {
      expect(shouldHideTasksFooter({}, true)).toBe(false)
    })

    it('当所有可见任务都是 in_process_teammate 时应该返回 true', () => {
      const tasks = {
        'task-1': { type: 'in_process_teammate' },
        'task-2': { type: 'in_process_teammate' },
      }
      expect(shouldHideTasksFooter(tasks as any, true)).toBe(true)
    })

    it('当有非 in_process_teammate 任务时应该返回 false', () => {
      const tasks = {
        'task-1': { type: 'in_process_teammate' },
        'task-2': { type: 'background' },
      }
      expect(shouldHideTasksFooter(tasks as any, true)).toBe(false)
    })
  })
})
