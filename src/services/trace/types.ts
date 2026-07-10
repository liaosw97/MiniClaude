/**
 * Trace 记录类型定义
 */

export interface TraceRecord {
  type: 'request' | 'response' | 'error'
  timestamp: string
  data: {
    body?: unknown
    headers?: Record<string, string>
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
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
  totalInputTokens: number
  totalOutputTokens: number
}

export interface TraceIndex {
  sessions: SessionMetadata[]
}

export const TRACES_DIR = 'traces'
export const INDEX_FILE = 'index.json'
