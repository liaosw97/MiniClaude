/**
 * Trace 录制层
 * 负责拦截 API 请求和响应
 */

import { appendTraceRecord } from './traceStore.js'
import { broadcastTraceRecord } from './traceServer.js'
import type { TraceRecord } from './types.js'
import { traceLogger } from './traceLogger.js'

export interface TraceRecorderOptions {
  enabled?: boolean
}

/**
 * 脱敏敏感 headers
 */
function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()

    if (lowerKey === 'authorization') {
      // authorization: 截断为前 12 字符 + ...***
      redacted[key] = value.length > 12 ? value.slice(0, 12) + '...***' : value
    } else if (lowerKey === 'x-api-key') {
      // x-api-key: 截断为前 12 字符 + ...***
      redacted[key] = value.length > 12 ? value.slice(0, 12) + '...***' : value
    } else if (lowerKey === 'cookie') {
      // cookie: 完全替换为 ***
      redacted[key] = '***'
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * 解析 SSE 流式响应
 */
async function parseSSEStream(body: ReadableStream<Uint8Array>): Promise<{ chunks: unknown[], usage?: unknown }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const chunks: unknown[] = []
  let usage: unknown = undefined
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            chunks.push(parsed)

            // 提取 usage 从 message_delta 事件
            if (parsed.type === 'message_delta' && parsed.usage) {
              usage = parsed.usage
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { chunks, usage }
}

/**
 * 创建 trace fetch wrapper
 * @param sessionId 会话 ID
 * @param configDir 配置目录路径
 * @param options 选项
 * @returns fetch wrapper 或 undefined（trace 未启用时）
 */
export function createTraceFetch(
  sessionId: string,
  configDir?: string,
  options: TraceRecorderOptions = {},
  innerFetch?: typeof globalThis.fetch
): ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined {
  const { enabled = true } = options

  if (!enabled) {
    return undefined
  }

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // 记录请求
    const rawHeaders = init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : undefined
    let requestBody: unknown = undefined
    try {
      requestBody = init?.body ? JSON.parse(init.body as string) : undefined
    } catch { /* ignore parse errors */ }

    const requestRecord: TraceRecord = {
      type: 'request',
      timestamp: new Date().toISOString(),
      data: {
        body: requestBody,
        headers: rawHeaders ? redactHeaders(rawHeaders) : undefined
      }
    }

    const requestId = crypto.randomUUID()
    const startTime = Date.now()

    // 异步记录请求，不阻塞 API 调用
    setImmediate(async () => {
      try {
        await appendTraceRecord(sessionId, requestRecord, undefined, configDir)
      } catch (error) {
        traceLogger.error('Failed to record request to JSONL', error)
      }
      try {
        broadcastTraceRecord({
          request_id: requestId,
          turn: String((requestBody as any)?.turn ?? ''),
          timestamp: requestRecord.timestamp,
          duration_ms: 0,
          request: {
            method: init?.method || 'POST',
            path: String(input),
            body: requestBody
          },
          response: { status: 0, body: null },
          transport: 'fetch'
        })
      } catch { /* SSE broadcast failure is non-fatal */ }
    })

    // 转发给 innerFetch（调用时解析，支持测试 mock）
    const response = await (innerFetch ?? globalThis.fetch)(input, init)

    // 检查是否为 SSE 流式响应
    const contentType = response.headers.get('content-type') || ''
    const isSSE = contentType.includes('text/event-stream')

    const elapsed = Date.now() - startTime

    if (isSSE) {
      // SSE 流式响应：克隆流并解析
      const responseClone = response.clone()
      setImmediate(async () => {
        let chunks: unknown[] = []
        let usage: unknown = undefined
        try {
          const parsed = await parseSSEStream(responseClone.body!)
          chunks = parsed.chunks
          usage = parsed.usage
          const responseRecord: TraceRecord = {
            type: 'response',
            timestamp: new Date().toISOString(),
            data: {
              body: { stream: true, chunks },
              usage: usage as TraceRecord['data']['usage']
            }
          }
          await appendTraceRecord(sessionId, responseRecord, undefined, configDir)
        } catch (error) {
          traceLogger.error('Failed to parse SSE stream', error)
        }
        try {
          broadcastTraceRecord({
            request_id: requestId,
            turn: String((requestBody as any)?.turn ?? ''),
            timestamp: new Date().toISOString(),
            duration_ms: elapsed,
            request: { method: init?.method || 'POST', path: String(input), body: requestBody },
            response: { status: response.status, body: { stream: true, chunks }, usage },
            transport: 'fetch'
          })
        } catch { /* SSE broadcast failure is non-fatal */ }
      })
    } else {
      // 非流式 JSON 响应
      const responseClone = response.clone()
      setImmediate(async () => {
        let responseBody: any = undefined
        try {
          responseBody = await responseClone.json()
          const responseRecord: TraceRecord = {
            type: 'response',
            timestamp: new Date().toISOString(),
            data: {
              body: responseBody,
              usage: responseBody.usage
            }
          }
          await appendTraceRecord(sessionId, responseRecord, undefined, configDir)
        } catch (error) {
          // 忽略响应解析错误
        }
        try {
          broadcastTraceRecord({
            request_id: requestId,
            turn: String((requestBody as any)?.turn ?? ''),
            timestamp: new Date().toISOString(),
            duration_ms: elapsed,
            request: { method: init?.method || 'POST', path: String(input), body: requestBody },
            response: { status: response.status, body: responseBody, usage: responseBody?.usage },
            transport: 'fetch'
          })
        } catch { /* SSE broadcast failure is non-fatal */ }
      })
    }

    return response
  }
}

/**
 * 检查 trace 是否启用
 */
export function isTraceEnabled(): boolean {
  return process.env.TRACE_ENABLED === 'true'
}

/**
 * 启用 trace
 */
export function enableTrace(): void {
  process.env.TRACE_ENABLED = 'true'
}

/**
 * 禁用 trace
 */
export function disableTrace(): void {
  process.env.TRACE_ENABLED = 'false'
}
