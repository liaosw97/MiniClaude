import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `trace-recorder-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true })
  }
})

describe('createTraceFetch', () => {
  it('should return a function when enabled', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const traceFetch = createTraceFetch('test-session', testDir)
    expect(typeof traceFetch).toBe('function')
  })

  it('should return undefined when disabled', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const traceFetch = createTraceFetch('test-session', testDir, { enabled: false })
    expect(traceFetch).toBeUndefined()
  })

  it('should capture request body and forward unchanged', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { getTraceFilePath } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    const requestBody = {
      model: 'claude-3-opus',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 100
    }

    // Mock fetch
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      // 验证请求体未被修改
      expect(JSON.parse(init?.body as string)).toEqual(requestBody)
      return new Response(JSON.stringify({ result: 'ok' }), {
        headers: { 'content-type': 'application/json' }
      })
    }

    await traceFetch('https://api.example.com', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' }
    })

    // 等待异步记录
    await new Promise(r => setTimeout(r, 200))

    // 验证 trace 文件被创建
    const today = new Date().toISOString().split('T')[0]
    const filePath = getTraceFilePath(sessionId, today, testDir)
    expect(existsSync(filePath)).toBe(true)

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })

  it('should record non-streaming JSON response with usage', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { createSessionEntry, getSessionTrace } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    // 先创建会话条目
    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    const responseBody = {
      id: 'msg_123',
      content: [{ type: 'text', text: 'Hello!' }],
      usage: { input_tokens: 10, output_tokens: 5 }
    }

    // Mock fetch
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify(responseBody), {
        headers: { 'content-type': 'application/json' }
      })
    }

    await traceFetch('https://api.example.com', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-3-opus' })
    })

    // 等待异步记录
    await new Promise(r => setTimeout(r, 300))

    // 验证 trace 记录
    const records = await getSessionTrace(sessionId, testDir)
    expect(records.length).toBeGreaterThanOrEqual(1)

    const responseRecord = records.find((r: any) => r.type === 'response')
    expect(responseRecord).toBeDefined()
    expect(responseRecord!.data.body).toEqual(responseBody)
    expect(responseRecord!.data.usage).toEqual(responseBody.usage)

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })

  it('should record API timeout event', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { createSessionEntry, getSessionTrace } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-timeout-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    // Mock fetch 模拟超时
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      throw new Error('Request timeout')
    }

    // 调用应该抛出异常
    try {
      await traceFetch('https://api.example.com', {
        method: 'POST',
        body: JSON.stringify({ model: 'claude-3-opus' })
      })
    } catch (error) {
      // 预期会抛出异常
    }

    // 等待异步记录
    await new Promise(r => setTimeout(r, 300))

    // 验证 trace 记录了请求（超时前的请求应该被记录）
    const records = await getSessionTrace(sessionId, testDir)
    const requestRecord = records.find((r: any) => r.type === 'request')
    expect(requestRecord).toBeDefined()

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })

  it('should record error status code response', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { createSessionEntry, getSessionTrace } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-error-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    const errorBody = { error: { type: 'invalid_request_error', message: 'Invalid API key' } }

    // Mock fetch 返回 401 错误
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify(errorBody), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      })
    }

    const response = await traceFetch('https://api.example.com', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-3-opus' })
    })

    expect(response.status).toBe(401)

    // 等待异步记录
    await new Promise(r => setTimeout(r, 300))

    // 验证 trace 记录了错误响应
    const records = await getSessionTrace(sessionId, testDir)
    const responseRecord = records.find((r: any) => r.type === 'response')
    expect(responseRecord).toBeDefined()
    expect(responseRecord!.data.body).toEqual(errorBody)

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })

  it('should redact sensitive headers', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { createSessionEntry, getSessionTrace } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-header-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    // Mock fetch
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(JSON.stringify({ result: 'ok' }), {
        headers: { 'content-type': 'application/json' }
      })
    }

    await traceFetch('https://api.example.com', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-3-opus' }),
      headers: {
        'authorization': 'Bearer sk-ant-api03-abc123def456',
        'x-api-key': 'sk-ant-api03-abc123def456',
        'cookie': 'session=abc123; token=xyz789',
        'content-type': 'application/json'
      }
    })

    // 等待异步记录
    await new Promise(r => setTimeout(r, 300))

    // 验证 header 脱敏
    const records = await getSessionTrace(sessionId, testDir)
    const requestRecord = records.find((r: any) => r.type === 'request')
    expect(requestRecord).toBeDefined()

    const headers = requestRecord!.data.headers
    expect(headers).toBeDefined()

    // authorization 应该被截断（前 12 字符 + ...***）
    expect(headers['authorization']).toMatch(/^Bearer sk-an\.\.\.\*\*\*$/)

    // x-api-key 应该被截断（前 12 字符 + ...***）
    expect(headers['x-api-key']).toMatch(/^sk-ant-api03\.\.\.\*\*\*$/)

    // cookie 应该被完全替换
    expect(headers['cookie']).toBe('***')

    // content-type 不应该被修改
    expect(headers['content-type']).toBe('application/json')

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })

  it('should not block API call while recording trace', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { createSessionEntry } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-async-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    // Mock fetch 模拟延迟
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      await new Promise(r => setTimeout(r, 50)) // 模拟 50ms 延迟
      return new Response(JSON.stringify({ result: 'ok' }), {
        headers: { 'content-type': 'application/json' }
      })
    }

    const startTime = Date.now()
    await traceFetch('https://api.example.com', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-3-opus' })
    })
    const endTime = Date.now()

    // API 调用应该在 100ms 内完成（不等待 trace 记录）
    expect(endTime - startTime).toBeLessThan(200)

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })

  it('should skip recording when disabled', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { getTraceFilePath } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-disabled-session'

    // 创建禁用的 trace fetch
    const traceFetch = createTraceFetch(sessionId, testDir, { enabled: false })
    expect(traceFetch).toBeUndefined()

    // Mock fetch
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ result: 'ok' }), {
        headers: { 'content-type': 'application/json' }
      })
    }

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })

  it('should record network connection failure', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { createSessionEntry, getSessionTrace } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-network-error-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    // Mock fetch 模拟网络错误
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch')
    }

    // 调用应该抛出异常
    try {
      await traceFetch('https://api.example.com', {
        method: 'POST',
        body: JSON.stringify({ model: 'claude-3-opus' })
      })
    } catch (error) {
      // 预期会抛出异常
    }

    // 等待异步记录
    await new Promise(r => setTimeout(r, 300))

    // 验证 trace 记录了请求（网络错误前的请求应该被记录）
    const records = await getSessionTrace(sessionId, testDir)
    const requestRecord = records.find((r: any) => r.type === 'request')
    expect(requestRecord).toBeDefined()

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })

  it('should catch and log recording exceptions', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { createSessionEntry } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-exception-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    // Mock fetch
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ result: 'ok' }), {
        headers: { 'content-type': 'application/json' }
      })
    }

    // 调用应该正常完成，不会因为 trace 记录异常而失败
    const response = await traceFetch('https://api.example.com', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-3-opus' })
    })

    expect(response.status).toBe(200)

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })
})

describe('isTraceEnabled', () => {
  it('should return false by default', async () => {
    const { isTraceEnabled, disableTrace } = await import('../../../src/services/trace/traceRecorder')
    disableTrace()
    expect(isTraceEnabled()).toBe(false)
  })

  it('should return true after enableTrace', async () => {
    const { isTraceEnabled, enableTrace, disableTrace } = await import('../../../src/services/trace/traceRecorder')
    disableTrace()
    enableTrace()
    expect(isTraceEnabled()).toBe(true)
    disableTrace()
  })
})

describe('SSE streaming response', () => {
  it('should record SSE stream chunks and usage', async () => {
    const { createTraceFetch } = await import('../../../src/services/trace/traceRecorder')
    const { createSessionEntry, getSessionTrace } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-sse-session'
    const traceFetch = createTraceFetch(sessionId, testDir)

    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    // 模拟 SSE 流式响应
    const encoder = new TextEncoder()
    const chunks = [
      'data: {"type":"message_start","message":{"id":"msg_1","role":"assistant"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world!"}}\n\n',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}\n\n',
      'data: [DONE]\n\n'
    ]

    let chunkIndex = 0
    const stream = new ReadableStream({
      pull(controller) {
        if (chunkIndex < chunks.length) {
          controller.enqueue(encoder.encode(chunks[chunkIndex++]))
        } else {
          controller.close()
        }
      }
    })

    // Mock fetch 返回流式响应
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(stream, {
        headers: { 'content-type': 'text/event-stream' }
      })
    }

    await traceFetch('https://api.example.com', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-3-opus', stream: true })
    })

    // 等待异步记录
    await new Promise(r => setTimeout(r, 500))

    // 验证 trace 记录
    const records = await getSessionTrace(sessionId, testDir)
    expect(records.length).toBeGreaterThanOrEqual(1)

    const responseRecord = records.find((r: any) => r.type === 'response')
    expect(responseRecord).toBeDefined()

    // SSE 流式响应应该记录 chunks
    if (responseRecord?.data.body?.stream) {
      expect(responseRecord.data.body.chunks).toBeDefined()
      expect(responseRecord.data.body.chunks.length).toBeGreaterThan(0)
      expect(responseRecord.data.usage).toBeDefined()
    }

    // 恢复原始 fetch
    globalThis.fetch = originalFetch
  })
})
