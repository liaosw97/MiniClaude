// tests/services/trace/ws-recorder-edge.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { wrapWebSocket, getMessages, resetMessages } from '../../../src/services/trace/ws-recorder.js'

describe('ws-recorder edge cases', () => {
  beforeEach(() => {
    resetMessages()
  })

  it('should handle binary messages', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = (data: any) => {}
    ws.url = 'ws://localhost:9090'
    const wrapped = wrapWebSocket(ws, 'ws://localhost:9090')
    wrapped!.send(new Uint8Array([1, 2, 3]))

    const messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].data).toBe('[binary]')
  })

  it('should handle null WebSocket gracefully', () => {
    const result = wrapWebSocket(null)
    expect(result).toBeNull()
  })

  it('should handle WebSocket without send function', () => {
    const ws = {} as WebSocket
    const result = wrapWebSocket(ws)
    expect(result).toBeNull()
  })

  it('should limit message buffer to MAX_MESSAGES', () => {
    const ws = new EventTarget() as unknown as WebSocket
    const sent: string[] = []
    ws.send = (data: any) => {
      sent.push(data)
    }
    ws.url = 'ws://localhost:9090'
    const wrapped = wrapWebSocket(ws, 'ws://localhost:9090')

    // 发送 1100 条消息，超出 1000 上限
    for (let i = 0; i < 1100; i++) {
      wrapped!.send(JSON.stringify({ seq: i }))
    }

    const messages = getMessages()
    // 环形缓冲区应只保留最近 1000 条
    expect(messages.length).toBe(1000)
    // 第一条应被覆盖
    expect(messages[0].data).toContain('"seq":100')
    // 最后一条应为 seq 1099
    expect(messages[999].data).toContain('"seq":1099')
  })

  it('should detect MCP notifications', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = (data: any) => {}
    ws.url = 'ws://localhost:9090'
    const wrapped = wrapWebSocket(ws, 'ws://localhost:9090')

    wrapped!.send(JSON.stringify({ method: 'tools/list_changed' }))
    wrapped!.send(JSON.stringify({ method: 'notifications/initialized' }))
    wrapped!.send(JSON.stringify({ method: 'resources/list' })) // 普通方法，不是通知

    const messages = getMessages()
    expect(messages.length).toBe(3)
    expect(messages[0].isMCPNotification).toBe(true)
    expect(messages[0].mcpMethod).toBe('tools/list_changed')
    expect(messages[1].isMCPNotification).toBe(true)
    expect(messages[1].mcpMethod).toBe('notifications/initialized')
    expect(messages[2].isMCPNotification).toBeFalsy()
  })

  it('should truncate long messages', () => {
    const ws = new EventTarget() as unknown as WebSocket
    ws.send = (data: any) => {}
    ws.url = 'ws://localhost:9090'
    const wrapped = wrapWebSocket(ws, 'ws://localhost:9090')

    // 500 字符不截断
    wrapped!.send('x'.repeat(500))
    let messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].data.length).toBe(500)
    expect(messages[0].data).not.toMatch(/\.\.\.$/)
    resetMessages()

    // 501 字符截断为 500 + '...' = 503
    wrapped!.send('x'.repeat(501))
    messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].data.length).toBe(503)
    expect(messages[0].data.endsWith('...')).toBe(true)
    expect(messages[0].data.slice(0, 500)).toBe('x'.repeat(500))
    resetMessages()

    // 1000 字符截断
    const longData = 'x'.repeat(1000)
    wrapped!.send(longData)
    messages = getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].data.length).toBe(503)
    expect(messages[0].data.endsWith('...')).toBe(true)
  })
})