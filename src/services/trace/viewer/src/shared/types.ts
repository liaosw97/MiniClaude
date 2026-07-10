/**
 * 共享类型定义 — Trace Viewer
 */

/** Trace 条目（viewer 内部使用） */
export interface TraceEntry {
  request_id: string
  turn: string
  timestamp: string
  duration_ms: number
  request: TraceRequest
  response: TraceResponse
  transport: string
}

/** Trace 请求 */
export interface TraceRequest {
  method: string
  path: string
  body: ApiRequestBody | null
}

/** Trace 响应 */
export interface TraceResponse {
  status: number
  body: ApiResponse | null
  usage?: Usage
}

/** API 请求体 */
export interface ApiRequestBody {
  model?: string
  messages?: Message[]
  system?: string | SystemBlock[]
  tools?: ToolDefinition[]
  max_tokens?: number
  stream?: boolean
  turn?: number
  [key: string]: unknown
}

/** API 响应体 */
export interface ApiResponse {
  id?: string
  type?: string
  role?: string
  content?: ContentBlock[]
  usage?: Usage
  error?: ApiError
  [key: string]: unknown
}

/** API 错误 */
export interface ApiError {
  type: string
  message: string
  code?: string
}

/** 消息 */
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | ContentBlock[]
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

/** 内容块 */
export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'image' | 'thinking'
  text?: string
  name?: string
  id?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | ContentBlock[]
  source?: ImageSource
  thinking?: string
}

/** 图片源 */
export interface ImageSource {
  type: 'base64'
  media_type: string
  data: string
}

/** 工具调用 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** 工具定义 */
export interface ToolDefinition {
  name: string
  description?: string
  input_schema?: Record<string, unknown>
}

/** 系统提示块 */
export interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

/** Token 用量 */
export interface Usage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

/** Diff 结果 */
export interface DiffResult {
  type: 'added' | 'removed' | 'changed' | 'unchanged'
  path: string
  oldValue?: unknown
  newValue?: unknown
  children?: DiffResult[]
}

/** SSE 事件 */
export interface SSEEvent {
  type: string
  data: Record<string, unknown>
}

/** Session 元数据 */
export interface SessionMetadata {
  id: string
  model: string
  startedAt: string
  lastActivity: string
  turns: number
  totalInputTokens: number
  totalOutputTokens: number
}
