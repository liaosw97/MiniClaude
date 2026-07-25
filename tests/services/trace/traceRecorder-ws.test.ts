import { describe, it, expect, beforeEach } from 'vitest'
import { enableWebSocketTracing } from '../../../src/services/trace/traceRecorder.js'
import { getMessages, resetMessages } from '../../../src/services/trace/ws-recorder.js'

describe('enableWebSocketTracing', () => {
  beforeEach(() => {
    resetMessages()
  })

  it('should return null when WebSocket is null', () => {
    const result = enableWebSocketTracing(null)
    expect(result).toBeNull()
  })

  it('should return wrapped WebSocket when valid', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = () => {}
    ;(ws as any).url = 'ws://localhost:9090'

    const result = enableWebSocketTracing(ws)
    expect(result).not.toBeNull()
    expect(result).toBe(ws)
  })

  it('should record messages through the wrapped WebSocket', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = () => {}
    ;(ws as any).url = 'ws://localhost:9090'

    const wrapped = enableWebSocketTracing(ws)
    expect(wrapped).not.toBeNull()
    if (!wrapped) return

    wrapped.send('{"method":"tools/call"}')

    const messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].direction).toBe('sent')
    expect(messages[0].data).toBe('{"method":"tools/call"}')
  })

  it('should record incoming messages through the wrapped WebSocket', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = () => {}
    ;(ws as any).url = 'ws://localhost:9090'

    const wrapped = enableWebSocketTracing(ws)
    expect(wrapped).not.toBeNull()
    if (!wrapped) return

    const event = new MessageEvent('message', { data: '{"result":"ok"}' })
    ws.dispatchEvent(event)

    const messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].direction).toBe('received')
  })
})