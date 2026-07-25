/**
 * Trace 记录类型定义
 */

export interface TraceRecord {
  type: 'request' | 'response' | 'error'
  timestamp: string
  data: {
    body?: unknown
    headers?: Record<string, string>
    turn?: number
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
    }
    normalized_usage?: {
      input_tokens: number | null
      output_tokens: number | null
      total_tokens: number | null
      cache_read_input_tokens: number | null
      cache_creation_input_tokens: number | null
    }
    error?: {
      type: string
      message: string
      statusCode?: number
    }
  }
}

export interface SessionMetadata {
  id: string
  date: string
  model: string
  startedAt: string
  lastActivity: string
  turns: number
  lastTurn: number
  totalInputTokens: number
  totalOutputTokens: number
  errors?: number
  cacheHits?: number
  cacheHitRate?: number
}

export interface TraceIndex {
  sessions: SessionMetadata[]
}

export const TRACES_DIR = 'traces'
export const INDEX_FILE = 'index.json'
