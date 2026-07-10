/**
 * WebSocket 响应处理 — Codex/流式响应格式
 *
 * 将 WebSocket 传输的流式响应数据转换为 viewer 可渲染的 TraceEntry 格式。
 * 支持 Anthropic 的 message_start/content_block_delta/message_stop 事件流。
 */

import type { TraceEntry, ContentBlock, Usage } from '../../shared/types'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** WebSocket 原始事件 */
interface WSEvent {
  type: string
  index?: number
  delta?: {
    type: string
    text?: string
    thinking?: string
    partial_json?: string
    stop_reason?: string
  }
  message?: {
    id: string
    model: string
    role: string
    usage: Usage
    content: ContentBlock[]
    stop_reason: string
  }
  content_block?: ContentBlock
  usage?: Usage
  error?: { type: string; message: string }
}

/** 聚合后的 WebSocket 响应 */
interface AggregatedResponse {
  id: string
  model: string
  role: string
  content: ContentBlock[]
  usage: Usage
  stop_reason: string
}

// ─── 事件聚合 ─────────────────────────────────────────────────────────────────

/**
 * 将 WebSocket 事件流聚合为完整的响应对象
 *
 * 处理 Anthropic 的事件序列：
 * - message_start: 初始化消息元数据
 * - content_block_start: 开始新的内容块
 * - content_block_delta: 增量更新内容块
 * - content_block_stop: 完成内容块
 * - message_delta: 更新消息级属性（stop_reason, usage）
 * - message_stop: 消息完成
 */
export function aggregateWSEvents(events: WSEvent[]): AggregatedResponse | null {
  if (events.length === 0) return null

  let response: AggregatedResponse | null = null
  let currentBlock: ContentBlock | null = null
  let currentBlockIndex = -1

  for (const event of events) {
    switch (event.type) {
      case 'message_start': {
        const msg = event.message
        if (msg) {
          response = {
            id: msg.id,
            model: msg.model,
            role: msg.role,
            content: [],
            usage: msg.usage ?? { input_tokens: 0, output_tokens: 0 },
            stop_reason: '',
          }
        }
        break
      }

      case 'content_block_start': {
        if (event.content_block && event.index !== undefined) {
          currentBlock = { ...event.content_block }
          currentBlockIndex = event.index
          if (response) {
            response.content[currentBlockIndex] = currentBlock
          }
        }
        break
      }

      case 'content_block_delta': {
        if (event.delta && currentBlock && currentBlockIndex >= 0) {
          const delta = event.delta
          if (delta.type === 'text_delta' && delta.text) {
            currentBlock.text = (currentBlock.text ?? '') + delta.text
          } else if (delta.type === 'thinking_delta' && delta.thinking) {
            currentBlock.thinking = (currentBlock.thinking ?? '') + delta.thinking
          } else if (delta.type === 'input_json_delta' && delta.partial_json) {
            // 工具调用的 JSON 增量
            if (!currentBlock.input) {
              currentBlock.input = {}
            }
            // 累积 partial_json 用于后续解析
            const existing = (currentBlock as any)._partialJson ?? ''
            ;(currentBlock as any)._partialJson = existing + delta.partial_json
            try {
              currentBlock.input = JSON.parse((currentBlock as any)._partialJson)
            } catch {
              // JSON 尚未完整，继续累积
            }
          }
        }
        break
      }

      case 'content_block_stop': {
        if (currentBlock && currentBlockIndex >= 0 && response) {
          // 清理临时字段
          delete (currentBlock as any)._partialJson
          response.content[currentBlockIndex] = currentBlock
          currentBlock = null
          currentBlockIndex = -1
        }
        break
      }

      case 'message_delta': {
        if (response && event.delta) {
          if (event.delta.stop_reason) {
            response.stop_reason = event.delta.stop_reason
          }
        }
        if (response && event.usage) {
          response.usage = {
            ...response.usage,
            output_tokens: event.usage.output_tokens,
          }
        }
        break
      }

      case 'message_stop': {
        // 消息完成，无需额外处理
        break
      }

      case 'error': {
        if (event.error && response) {
          response.stop_reason = 'error'
        }
        break
      }
    }
  }

  return response
}

/**
 * 将聚合后的响应转换为 TraceEntry 的 response 字段格式
 */
export function wsResponseToTraceResponse(aggregated: AggregatedResponse | null): {
  status: number
  body: any
  usage: Usage | undefined
} {
  if (!aggregated) {
    return { status: 0, body: null, usage: undefined }
  }

  return {
    status: 200,
    body: {
      id: aggregated.id,
      type: 'message',
      role: aggregated.role,
      content: aggregated.content,
      model: aggregated.model,
      stop_reason: aggregated.stop_reason,
    },
    usage: aggregated.usage,
  }
}

/**
 * 展开 WebSocket 响应条目（将流式事件聚合为完整响应）
 *
 * 用于 viewer 中选中条目时，将原始 WebSocket 事件流
 * 转换为可渲染的完整响应。
 */
export function expandWebSocketResponseEntries(
  entries: TraceEntry[]
): TraceEntry[] {
  return entries.map(entry => {
    if (entry.transport !== 'websocket') return entry

    const body = entry.response.body
    if (!body?.events) return entry

    // 聚合 WebSocket 事件
    const aggregated = aggregateWSEvents(body.events)
    const { status, body: newBody, usage } = wsResponseToTraceResponse(aggregated)

    return {
      ...entry,
      response: {
        status,
        body: newBody,
        usage,
      },
    }
  })
}

/**
 * 从 WebSocket 事件流中提取文本内容
 */
export function extractWSText(events: WSEvent[]): string {
  return events
    .filter(e => e.type === 'content_block_delta' && e.delta?.type === 'text_delta')
    .map(e => e.delta?.text ?? '')
    .join('')
}

/**
 * 从 WebSocket 事件流中提取 thinking 内容
 */
export function extractWSThinking(events: WSEvent[]): string {
  return events
    .filter(e => e.type === 'content_block_delta' && e.delta?.type === 'thinking_delta')
    .map(e => e.delta?.thinking ?? '')
    .join('')
}
