/**
 * WebSocket 消息装饰器
 * 使用装饰器模式拦截 WebSocket 双向消息，支持 MCP 通知识别
 */

export interface WSMessage {
  direction: 'sent' | 'received'
  data: string
  timestamp: number
  isMCPNotification?: boolean
  mcpMethod?: string
}

const MAX_MESSAGES = 1000
const messages: WSMessage[] = []
let head = 0
let count = 0

/**
 * 返回当前会话的所有 WebSocket 消息记录
 * 每次调用返回快照，不重置记录
 */
export function getMessages(): WSMessage[] {
  if (count === 0) return []
  const result: WSMessage[] = []
  for (let i = 0; i < count; i++) {
    result.push(messages[(head + i) % MAX_MESSAGES])
  }
  return result
}

/**
 * 重置消息记录（用于测试）
 */
export function resetMessages(): void {
  messages.length = 0
  head = 0
  count = 0
}

function detectMCPNotification(data: string): { isMCPNotification: boolean; mcpMethod?: string } {
  try {
    const parsed = JSON.parse(data)
    if (parsed.method && typeof parsed.method === 'string') {
      if (parsed.method.startsWith('notifications/') || parsed.method === 'tools/list_changed') {
        return { isMCPNotification: true, mcpMethod: parsed.method }
      }
    }
  } catch {
    // 非 JSON 消息，跳过
  }
  return { isMCPNotification: false }
}

function recordMessage(direction: 'sent' | 'received', data: string): void {
  const truncatedData = data.length > 500 ? data.slice(0, 500) + '...' : data
  const { isMCPNotification, mcpMethod } = detectMCPNotification(data)

  const msg: WSMessage = {
    direction,
    data: truncatedData,
    timestamp: Date.now(),
    ...(isMCPNotification ? { isMCPNotification, mcpMethod } : {}),
  }

  if (count < MAX_MESSAGES) {
    messages[(head + count) % MAX_MESSAGES] = msg
    count++
  } else {
    messages[head] = msg
    head = (head + 1) % MAX_MESSAGES
  }
}

/**
 * 包装 WebSocket 实例，拦截所有 send() 调用和 message 事件
 * 不修改原始 WebSocket 行为
 */
export function wrapWebSocket(ws: WebSocket | null, _url?: string): WebSocket | null {
  if (!ws || typeof ws.send !== 'function') return null

  const originalSend = ws.send.bind(ws)
  ws.send = function (data: string | ArrayBuffer | ArrayBufferView): void {
    const str = typeof data === 'string' ? data : '[binary]'
    recordMessage('sent', str)
    return originalSend(data)
  }

  ws.addEventListener('message', (event: MessageEvent) => {
    const data = typeof event.data === 'string' ? event.data : '[binary]'
    recordMessage('received', data)
  })

  return ws
}
