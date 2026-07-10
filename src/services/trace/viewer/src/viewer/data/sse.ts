/**
 * SSE 实时模式 — 处理 /events 端点的实时数据流
 *
 * 负责：
 * - 建立和管理 SSE 连接
 * - 实时接收和处理 trace 记录
 * - 连接状态管理和重连逻辑
 * - 记录去重
 */

import type { TraceEntry } from '../../shared/types'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** SSE 连接状态 */
export type SSEStatus = 'connected' | 'disconnected' | 'reconnecting'

/** SSE 事件处理器 */
export interface SSEHandlers {
  onRecord?: (entry: TraceEntry) => void
  onStatusChange?: (status: SSEStatus) => void
  onError?: (error: Event) => void
}

/** SSE 连接配置 */
export interface SSEConfig {
  /** SSE 端点路径 */
  endpoint?: string
  /** 重连间隔（毫秒） */
  reconnectInterval?: number
  /** 最大重连次数 */
  maxReconnects?: number
  /** 去重窗口大小（保留最近 N 个 request_id） */
  dedupWindowSize?: number
}

// ─── 默认配置 ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<SSEConfig> = {
  endpoint: '/events',
  reconnectInterval: 3000,
  maxReconnects: 10,
  dedupWindowSize: 1000,
}

// ─── SSE 管理器 ───────────────────────────────────────────────────────────────

export class SSEManager {
  private eventSource: EventSource | null = null
  private config: Required<SSEConfig>
  private handlers: SSEHandlers
  private status: SSEStatus = 'disconnected'
  private reconnectCount = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private seenIds = new Set<string>()
  private records: TraceEntry[] = []

  constructor(handlers: SSEHandlers = {}, config: SSEConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.handlers = handlers
  }

  /**
   * 建立 SSE 连接
   */
  connect(): void {
    // 清除现有定时器，防止多次调用导致多个定时器同时存在
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.eventSource) {
      this.disconnect()
    }

    this.setStatus('reconnecting')

    try {
      this.eventSource = new EventSource(this.config.endpoint)

      this.eventSource.onopen = () => {
        this.reconnectCount = 0
        this.setStatus('connected')
      }

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event)
      }

      this.eventSource.onerror = (event) => {
        this.handleError(event)
      }
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      this.setStatus('disconnected')
      this.scheduleReconnect()
    }
  }

  /**
   * 断开 SSE 连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.setStatus('disconnected')
  }

  /**
   * 获取当前状态
   */
  getStatus(): SSEStatus {
    return this.status
  }

  /**
   * 获取已接收的记录
   */
  getRecords(): TraceEntry[] {
    return [...this.records]
  }

  /**
   * 清空记录
   */
  clearRecords(): void {
    this.records = []
    this.seenIds.clear()
  }

  /**
   * 获取去重后的记录数量
   */
  getRecordCount(): number {
    return this.records.length
  }

  // ─── 内部方法 ─────────────────────────────────────────────────────────────

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)

      // 忽略连接确认消息
      if (data.type === 'connected') {
        return
      }

      // 忽略刷新通知
      if (data.type === 'refresh') {
        return
      }

      // 去重检查
      if (data.request_id && this.seenIds.has(data.request_id)) {
        return
      }

      // 添加到去重集合
      if (data.request_id) {
        this.seenIds.add(data.request_id)
        this.pruneDedupWindow()
      }

      // 转换为 TraceEntry
      const entry = this.parseRecord(data)
      if (entry) {
        this.records.push(entry)
        this.handlers.onRecord?.(entry)
      }
    } catch (error) {
      console.error('Failed to parse SSE data:', error)
    }
  }

  private handleError(event: Event): void {
    this.handlers.onError?.(event)

    if (this.eventSource?.readyState === EventSource.CLOSED) {
      this.setStatus('disconnected')
      this.scheduleReconnect()
    } else {
      this.setStatus('reconnecting')
    }
  }

  private setStatus(newStatus: SSEStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus
      this.handlers.onStatusChange?.(newStatus)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectCount >= this.config.maxReconnects) {
      console.warn(`SSE: Max reconnect attempts (${this.config.maxReconnects}) reached`)
      return
    }

    this.reconnectCount++
    const delay = this.config.reconnectInterval * Math.min(this.reconnectCount, 5)

    console.log(`SSE: Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private parseRecord(data: any): TraceEntry | null {
    // 验证必要字段
    if (!data.request_id) {
      return null
    }

    return {
      request_id: data.request_id,
      turn: String(data.turn ?? ''),
      timestamp: data.timestamp ?? new Date().toISOString(),
      duration_ms: data.duration_ms ?? 0,
      request: {
        method: data.request?.method ?? 'POST',
        path: data.request?.path ?? '',
        body: data.request?.body ?? null,
      },
      response: {
        status: data.response?.status ?? 0,
        body: data.response?.body ?? null,
        usage: data.response?.usage,
      },
      transport: data.transport ?? 'fetch',
    }
  }

  private pruneDedupWindow(): void {
    if (this.seenIds.size > this.config.dedupWindowSize * 2) {
      // 保留最近的 dedupWindowSize 个 ID
      const idsArray = Array.from(this.seenIds)
      const keepIds = idsArray.slice(-this.config.dedupWindowSize)
      this.seenIds = new Set(keepIds)
    }
  }
}

// ─── 便捷函数 ─────────────────────────────────────────────────────────────────

/**
 * 创建并启动 SSE 连接
 */
export function initLiveMode(
  handlers: SSEHandlers = {},
  config: SSEConfig = {}
): SSEManager {
  const manager = new SSEManager(handlers, config)
  manager.connect()
  return manager
}

/**
 * 从 API 获取历史会话列表
 */
export async function fetchSessions(): Promise<any[]> {
  try {
    const response = await fetch('/api/sessions')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return []
  }
}

/**
 * 从 API 获取指定会话的 trace 数据
 */
export async function fetchSessionTraces(sessionId: string): Promise<TraceEntry[]> {
  try {
    const response = await fetch(`/api/traces/${encodeURIComponent(sessionId)}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error(`Failed to fetch traces for session ${sessionId}:`, error)
    return []
  }
}

/**
 * 获取可用日期列表
 */
export async function fetchDates(): Promise<string[]> {
  try {
    const response = await fetch('/api/dates')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch dates:', error)
    return []
  }
}
