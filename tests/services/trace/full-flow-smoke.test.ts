// tests/services/trace/full-flow-smoke.test.ts
import { describe, it, expect } from 'vitest'
import { SSEReassembler } from '../../../src/services/trace/sse-reassembler.js'
import { normalizeUsage } from '../../../src/services/trace/normalize-usage.js'
import { computeDiff } from '../../../src/services/trace/diff.js'

describe('full flow smoke test', () => {
  it('recording → SSE reassembly → token normalization → storage → query → diff', () => {
    // 1. 模拟 SSE 录制（Anthropic 格式）
    const reassembler = new SSEReassembler()
    reassembler.feedLine('event: message_start')
    reassembler.feedLine('data: {"type":"message_start","message":{"id":"msg1","content":[],"model":"claude-3","role":"assistant","stop_reason":null,"usage":{"input_tokens":10}}}')
    reassembler.feedLine('')
    reassembler.feedLine('event: content_block_start')
    reassembler.feedLine('data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"Hello"}}')
    reassembler.feedLine('')
    reassembler.feedLine('event: content_block_delta')
    reassembler.feedLine('data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" World"}}')
    reassembler.feedLine('')
    reassembler.feedLine('event: message_delta')
    reassembler.feedLine('data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"input_tokens":10,"output_tokens":20}}')
    reassembler.feedLine('')
    reassembler.feedLine('event: message_stop')
    reassembler.feedLine('data: {"type":"message_stop"}')
    reassembler.feedLine('')

    const record = reassembler.reconstruct()
    expect(record).not.toBeNull()
    expect(record!.content).toHaveLength(1)
    expect(record!.content[0].text).toBe('Hello World')

    // 2. Token 归一化
    if (record && record.usage) {
      const normalized = normalizeUsage(record.usage)
      expect(normalized).not.toBeNull()
      expect((normalized as any).input_tokens).toBe(10)
      expect((normalized as any).output_tokens).toBe(20)
    }

    // 3. 模拟相邻请求 diff
    const request1 = JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }, null, 2)
    const request2 = JSON.stringify({ messages: [{ role: 'user', content: 'Hello World' }] }, null, 2)
    const diff = computeDiff(request1, request2)

    expect(diff.length).toBeGreaterThan(0)
    const insertions = diff.filter(d => d.op === 'insert')
    expect(insertions.length).toBeGreaterThan(0)
  })

  it('runtime adapter: detect → create server → handle request → security headers', async () => {
    const { detectRuntime } = await import('../../../src/compat/runtime.js')
    const { createRuntimeServer } = await import('../../../src/services/trace/runtime/server.js')

    const runtime = detectRuntime()
    expect(['bun', 'node', 'deno']).toContain(runtime)

    const server = createRuntimeServer()
    const { port, stop } = await server.serve(async (req) => {
      return new Response(JSON.stringify({ runtime, ok: true }), {
        headers: {
          'Content-Type': 'application/json',
          'X-Frame-Options': 'DENY',
        },
      })
    })

    const res = await fetch(`http://localhost:${port}/`)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.runtime).toBe(runtime)
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    stop()
  })
})