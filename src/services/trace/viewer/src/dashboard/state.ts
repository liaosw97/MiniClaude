/**
 * Dashboard 状态管理
 *
 * 集中管理 dashboard 的全局状态，包括：
 * - 会话列表
 * - 过滤后的会话列表
 * - 选中的会话 ID
 * - 搜索关键词
 */

import type { SessionMetadata } from '../shared/types'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** Dashboard 状态 */
export interface DashboardState {
  /** 所有会话列表 */
  sessions: SessionMetadata[]
  /** 过滤后的会话列表 */
  filtered: SessionMetadata[]
  /** 选中的会话 ID */
  selectedSessionId: string | null
  /** 搜索关键词 */
  search: string
  /** Agent 筛选 */
  agentFilter: string | null
}

// ─── 状态实例 ─────────────────────────────────────────────────────────────────

export const state: DashboardState = {
  sessions: [],
  filtered: [],
  selectedSessionId: null,
  search: '',
  agentFilter: null,
}

// ─── 状态操作 ─────────────────────────────────────────────────────────────────

/**
 * 设置会话列表
 */
export function setSessions(sessions: SessionMetadata[]): void {
  state.sessions = sessions
  applyFilter()
}

/**
 * 设置搜索关键词
 */
export function setSearch(search: string): void {
  state.search = search
  applyFilter()
}

/**
 * 设置 Agent 筛选
 */
export function setAgentFilter(agent: string | null): void {
  state.agentFilter = agent
  applyFilter()
}

/**
 * 设置选中的会话 ID
 */
export function setSelectedSession(id: string | null): void {
  state.selectedSessionId = id
}

/**
 * 应用过滤
 *
 * 根据搜索关键词和 Agent 筛选过滤会话列表。
 */
export function applyFilter(): void {
  let filtered = state.sessions

  // 搜索过滤
  if (state.search) {
    const q = state.search.toLowerCase()
    filtered = filtered.filter(s =>
      s.id.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q)
    )
  }

  // Agent 筛选
  if (state.agentFilter) {
    filtered = filtered.filter(s =>
      s.model === state.agentFilter
    )
  }

  state.filtered = filtered
}

/**
 * 获取所有唯一的 Agent（Model）
 */
export function getUniqueAgents(): string[] {
  const agents = new Set(state.sessions.map(s => s.model))
  return Array.from(agents).sort()
}

/**
 * 计算概览指标
 */
export function computeOverviewMetrics(): {
  totalSessions: number
  totalTokens: number
  totalTurns: number
  uniqueModels: number
  cacheHitRate: number | null
} {
  const sessions = state.sessions
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalInputTokens + s.totalOutputTokens, 0)
  const totalTurns = sessions.reduce((sum, s) => sum + s.turns, 0)
  const uniqueModels = new Set(sessions.map(s => s.model)).size

  // 计算缓存命中率：仅当有缓存数据时返回
  let totalCacheHits = 0
  let totalRequests = 0
  let hasCacheData = false
  for (const s of sessions) {
    const hits = s.cacheHits ?? 0
    const requests = s.turns || 0
    if (s.cacheHits !== undefined) {
      hasCacheData = true
    }
    totalCacheHits += hits
    totalRequests += s.turns || 0
  }

  return {
    totalSessions: sessions.length,
    totalTokens,
    totalTurns,
    uniqueModels,
    cacheHitRate: hasCacheData && totalRequests > 0 ? totalCacheHits / totalRequests : null,
  }
}

/**
 * 清空状态
 */
export function clearState(): void {
  state.sessions = []
  state.filtered = []
  state.selectedSessionId = null
  state.search = ''
  state.agentFilter = null
}
