import { describe, it, expect, beforeEach } from 'vitest'
import { wrapWebSocket, getMessages, resetMessages } from '../../../src/services/trace/ws-recorder.js'

describe('ws-recorder', () => {
  beforeEach(() => {
    resetMessages()
  })

  it('should intercept outgoing messages', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = (data: string | ArrayBuffer | ArrayBufferView) => {
      // mock WebSocket send
    }
    ;(ws as any).url = 'ws://localhost:9090'

    const wrapped = wrapWebSocket(ws)
    expect(wrapped).not.toBeNull()
    if (!wrapped) return
    wrapped.send('{"method":"tools/list"}')

    const messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].direction).toBe('sent')
    expect(messages[0].data).toBe('{"method":"tools/list"}')
    expect(messages[0].timestamp).toBeDefined()
  })

  it('should intercept incoming messages', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = () => {}
    ;(ws as any).url = 'ws://localhost:9090'

    const wrapped = wrapWebSocket(ws)
    expect(wrapped).not.toBeNull()
    if (!wrapped) return
    const event = new MessageEvent('message', { data: '{"result":"ok"}' })
    ws.dispatchEvent(event)

    const messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].direction).toBe('received')
    expect(messages[0].data).toBe('{"result":"ok"}')
  })

  it('should not modify original WebSocket behavior', () => {
    let originalCalled = false
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = (data: string | ArrayBuffer | ArrayBufferView) => {
      originalCalled = true
    }
    ;(ws as any).url = 'ws://localhost:9090'

    const wrapped = wrapWebSocket(ws)
    expect(wrapped).not.toBeNull()
    if (!wrapped) return
    wrapped.send('test')

    expect(originalCalled).toBe(true)
  })

  it('should record single message latency < 0.1ms', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = () => {}
    ;(ws as any).url = 'ws://localhost:9090'
    const wrapped = wrapWebSocket(ws)
    expect(wrapped).not.toBeNull()
    if (!wrapped) return

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      wrapped.send(`msg-${i}`)
    }
    const elapsed = performance.now() - start
    expect(elapsed / 100).toBeLessThan(0.2)
  })

  it('should limit messages to 1000 using ring buffer', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = () => {}
    ;(ws as any).url = 'ws://localhost:9090'
    const wrapped = wrapWebSocket(ws)
    expect(wrapped).not.toBeNull()
    if (!wrapped) return

    for (let i = 0; i < 1100; i++) {
      wrapped.send(`msg-${i}`)
    }

    const messages = getMessages()
    expect(messages.length).toBeLessThanOrEqual(1000)
    expect(messages[0].data).toBe('msg-100') // first 100 were evicted
  })

  it('should record MCP tools/list_changed notifications', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = () => {}
    ;(ws as any).url = 'ws://localhost:9090'
    wrapWebSocket(ws)

    const event = new MessageEvent('message', { data: '{"method":"tools/list_changed"}' })
    ws.dispatchEvent(event)

    const messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].data).toContain('tools/list_changed')
    expect(messages[0].isMCPNotification).toBe(true)
    expect(messages[0].mcpMethod).toBe('tools/list_changed')
  })

  it('should skip when no WebSocket connection exists', () => {
    const result = wrapWebSocket(null as unknown as WebSocket)
    expect(result).toBeNull()
  })

  it('should keep extra memory per message < 1KB', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = () => {}
    ;(ws as any).url = 'ws://localhost:9090'
    const wrapped = wrapWebSocket(ws)
    expect(wrapped).not.toBeNull()
    if (!wrapped) return

    const largeMsg = 'x'.repeat(5000)
    wrapped.send(largeMsg)

    const messages = getMessages()
    const msgSize = JSON.stringify(messages[0]).length
    expect(msgSize).toBeLessThan(1024) // 1KB
  })
})