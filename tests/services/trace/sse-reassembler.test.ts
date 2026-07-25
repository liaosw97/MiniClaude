import { describe, it, expect, vi } from 'vitest'
import { SSEReassembler } from '../../../src/services/trace/sse-reassembler.js'

describe('SSE reassembler', () => {
  it('should reassemble Anthropic SSE stream', () => {
    const reassembler = new SSEReassembler()
    reassembler.feedLine('event: message_start')
    reassembler.feedLine('data: {"type":"message_start","message":{"id":"msg1","content":[],"model":"claude-3","role":"assistant","stop_reason":null,"usage":{"input_tokens":10}}}')
    reassembler.feedLine('')
    reassembler.feedLine('event: content_block_start')
    reassembler.feedLine('data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"Hello"}}')
    reassembler.feedLine('')
    reassembler.feedLine('event: content_block_delta')
    reassembler.feedLine('data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}')
    reassembler.feedLine('')
    reassembler.feedLine('event: message_delta')
    reassembler.feedLine('data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"input_tokens":10,"output_tokens":5}}')
    reassembler.feedLine('')
    reassembler.feedLine('event: message_stop')
    reassembler.feedLine('data: {"type":"message_stop"}')
    reassembler.feedLine('')

    const result = reassembler.reconstruct()
    expect(result).not.toBeNull()
    expect(result!.content).toHaveLength(1)
    expect(result!.content[0].text).toBe('Hello world')
    expect(result!.usage?.output_tokens).toBe(5)
  })

  it('should reassemble OpenAI SSE stream', () => {
    const reassembler = new SSEReassembler()
    reassembler.feedLine('data: {"choices":[{"delta":{"role":"assistant"},"index":0}]}')
    reassembler.feedLine('')
    reassembler.feedLine('data: {"choices":[{"delta":{"content":"Hello"},"index":0}]}')
    reassembler.feedLine('')
    reassembler.feedLine('data: {"choices":[{"delta":{"content":" world"},"index":0}]}')
    reassembler.feedLine('')
    reassembler.feedLine('data: {"choices":[{"delta":{},"finish_reason":"stop","index":0}],"usage":{"prompt_tokens":10,"completion_tokens":5}}')
    reassembler.feedLine('')
    reassembler.feedLine('data: [DONE]')
    reassembler.feedLine('')

    const result = reassembler.reconstruct()
    expect(result).not.toBeNull()
    expect(result!.choices[0].message.content).toBe('Hello world')
    expect(result!.usage?.completion_tokens).toBe(5)
  })

  it('should reassemble Gemini SSE stream', () => {
    const reassembler = new SSEReassembler()
    reassembler.feedLine('data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]},"index":0}]}')
    reassembler.feedLine('')
    reassembler.feedLine('data: {"candidates":[{"content":{"parts":[{"text":" world"}]},"index":0}]}')
    reassembler.feedLine('')

    const result = reassembler.reconstruct()
    expect(result).not.toBeNull()
    expect(result!.candidates).toHaveLength(1)
    expect(result!.candidates[0].content.parts[0].text).toBe(' world')
  })

  it('should handle unknown protocol gracefully with warning log', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const reassembler = new SSEReassembler()
    reassembler.feedLine('data: {"unknown":"format"}')
    const result = reassembler.reconstruct()
    expect(result).not.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      '[trace] Unknown SSE protocol, falling back to raw text mode: {"unknown":"format"}',
    )
    warnSpy.mockRestore()
  })

  it('should support storeEvents mode', () => {
    const reassembler = new SSEReassembler(true)
    reassembler.feedLine('data: {"test":"data"}')
    reassembler.feedLine('')
    expect(reassembler.getEvents()).toHaveLength(1)
  })

  it('should NOT store events in default mode', () => {
    const reassembler = new SSEReassembler(false)
    reassembler.feedLine('data: {"test":"data"}')
    reassembler.feedLine('')
    expect(reassembler.getEvents()).toHaveLength(0)
  })

  it('should return partial result when stream is in progress', () => {
    const reassembler = new SSEReassembler()
    reassembler.feedLine('data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]},"index":0}]}')
    reassembler.feedLine('')
    // 流未结束，调用 reconstruct 应返回已有部分
    const partial = reassembler.reconstruct()
    expect(partial).not.toBeNull()
    expect(partial!.candidates).toHaveLength(1)
    expect(partial!.candidates[0].content.parts[0].text).toBe('Hello')
  })

  it('should auto-complete on message_stop', () => {
    const reassembler = new SSEReassembler()
    reassembler.feedLine('event: message_stop')
    reassembler.feedLine('data: {"type":"message_stop"}')
    reassembler.feedLine('')
    expect(reassembler.isCompleted()).toBe(true)
  })

  it('should auto-complete on [DONE]', () => {
    const reassembler = new SSEReassembler()
    reassembler.feedLine('data: [DONE]')
    reassembler.feedLine('')
    expect(reassembler.isCompleted()).toBe(true)
  })

  it('should not accumulate raw events when storeEvents is false', () => {
    // O(1) 内存验证：storeEvents=false 时 events 数组应始终为空
    const reassembler = new SSEReassembler(false)
    for (let i = 0; i < 10000; i++) {
      reassembler.feedLine('event: ping')
      reassembler.feedLine('data: {"seq":' + i + '}')
      reassembler.feedLine('')
    }
    // events 数组不应累积任何数据
    expect(reassembler.getEvents()).toHaveLength(0)
  })
})