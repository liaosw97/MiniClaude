import { describe, it, expect, beforeEach } from 'vitest'
import {
  state,
  setSessions,
  setSearch,
  setAgentFilter,
  setSelectedSession,
  applyFilter,
  getUniqueAgents,
  computeOverviewMetrics,
  clearState,
} from '../../../../src/services/trace/viewer/src/dashboard/state.js'

const mockSessions = [
  { id: 's1', model: 'claude-opus', totalInputTokens: 100, totalOutputTokens: 50, turns: 3 },
  { id: 's2', model: 'claude-sonnet', totalInputTokens: 200, totalOutputTokens: 100, turns: 5 },
  { id: 's3', model: 'claude-opus', totalInputTokens: 300, totalOutputTokens: 150, turns: 7 },
] as any[]

describe('dashboard state', () => {
  beforeEach(() => {
    clearState()
  })

  describe('setSessions', () => {
    it('设置会话列表', () => {
      setSessions(mockSessions)
      expect(state.sessions).toHaveLength(3)
      expect(state.filtered).toHaveLength(3)
    })
  })

  describe('setSearch', () => {
    it('按 ID 搜索', () => {
      setSessions(mockSessions)
      setSearch('s1')
      expect(state.filtered).toHaveLength(1)
      expect(state.filtered[0].id).toBe('s1')
    })

    it('按 model 搜索', () => {
      setSessions(mockSessions)
      setSearch('sonnet')
      expect(state.filtered).toHaveLength(1)
      expect(state.filtered[0].model).toBe('claude-sonnet')
    })

    it('搜索大小写不敏感', () => {
      setSessions(mockSessions)
      setSearch('OPUS')
      expect(state.filtered).toHaveLength(2)
    })

    it('清空搜索恢复全部', () => {
      setSessions(mockSessions)
      setSearch('s1')
      expect(state.filtered).toHaveLength(1)
      setSearch('')
      expect(state.filtered).toHaveLength(3)
    })
  })

  describe('setAgentFilter', () => {
    it('按 agent 过滤', () => {
      setSessions(mockSessions)
      setAgentFilter('claude-opus')
      expect(state.filtered).toHaveLength(2)
    })

    it('清空 agent 过滤', () => {
      setSessions(mockSessions)
      setAgentFilter('claude-opus')
      expect(state.filtered).toHaveLength(2)
      setAgentFilter(null)
      expect(state.filtered).toHaveLength(3)
    })
  })

  describe('搜索 + agent 组合过滤', () => {
    it('同时应用搜索和 agent 过滤', () => {
      setSessions(mockSessions)
      setAgentFilter('claude-opus')
      setSearch('s1')
      expect(state.filtered).toHaveLength(1)
      expect(state.filtered[0].id).toBe('s1')
    })
  })

  describe('setSelectedSession', () => {
    it('设置选中会话', () => {
      setSelectedSession('s1')
      expect(state.selectedSessionId).toBe('s1')
    })

    it('清空选中', () => {
      setSelectedSession('s1')
      setSelectedSession(null)
      expect(state.selectedSessionId).toBeNull()
    })
  })

  describe('getUniqueAgents', () => {
    it('返回去重排序的 agent 列表', () => {
      setSessions(mockSessions)
      const agents = getUniqueAgents()
      expect(agents).toEqual(['claude-opus', 'claude-sonnet'])
    })

    it('返回空数组当无会话', () => {
      expect(getUniqueAgents()).toEqual([])
    })
  })

  describe('computeOverviewMetrics', () => {
    it('计算概览指标', () => {
      setSessions(mockSessions)
      const metrics = computeOverviewMetrics()
      expect(metrics.totalSessions).toBe(3)
      expect(metrics.totalTokens).toBe(900) // (100+50)+(200+100)+(300+150)
      expect(metrics.totalTurns).toBe(15) // 3+5+7
      expect(metrics.uniqueModels).toBe(2)
    })

    it('返回零值当无会话', () => {
      const metrics = computeOverviewMetrics()
      expect(metrics.totalSessions).toBe(0)
      expect(metrics.totalTokens).toBe(0)
      expect(metrics.totalTurns).toBe(0)
      expect(metrics.uniqueModels).toBe(0)
    })
  })

  describe('clearState', () => {
    it('清空所有状态', () => {
      setSessions(mockSessions)
      setSearch('test')
      setSelectedSession('s1')
      clearState()
      expect(state.sessions).toEqual([])
      expect(state.filtered).toEqual([])
      expect(state.selectedSessionId).toBeNull()
      expect(state.search).toBe('')
      expect(state.agentFilter).toBeNull()
    })
  })
})
