// src/services/trace/sse-reassembler.ts

interface SSEEvent {
  event?: string
  data: string
  timestamp: number
}

export interface ReassembledResponse {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>
  choices?: any[]
  candidates?: any[]
  usage?: any
  model?: string
  stop_reason?: string
  [key: string]: unknown
}

export class SSEReassembler {
  private buffer: string = ''
  private currentEvent: string = ''
  private result: ReassembledResponse = {}
  private events: SSEEvent[] = []
  private storeEvents: boolean
  private protocol: 'anthropic' | 'openai' | 'gemini' | 'unknown' = 'unknown'
  private completed: boolean = false

  constructor(storeEvents: boolean = false) {
    this.storeEvents = storeEvents
  }

  feedLine(line: string): void {
    if (line === '') {
      this.currentEvent = ''
      return
    }

    if (line.startsWith('event: ')) {
      this.currentEvent = line.slice(7).trim()
      return
    }

    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim()
      if (this.storeEvents) {
        this.events.push({ event: this.currentEvent, data, timestamp: Date.now() })
      }

      if (data === '[DONE]') {
        this.completed = true
        return
      }

      try {
        const parsed = JSON.parse(data)

        // Anthropic 协议
        if (parsed.type === 'message_start') {
          this.protocol = 'anthropic'
          this.result = { ...parsed.message }
          return
        }
        if (parsed.type === 'content_block_start') {
          if (this.protocol === 'anthropic' && parsed.content_block) {
            if (!this.result.content) this.result.content = []
            this.result.content.push(parsed.content_block)
          }
          return
        }
        if (parsed.type === 'content_block_delta') {
          if (this.protocol === 'anthropic' && parsed.delta) {
            const block = this.result.content?.[parsed.index]
            if (!block) return
            if (parsed.delta.type === 'text_delta') {
              block.text = (block.text || '') + parsed.delta.text
            } else if (parsed.delta.type === 'input_json_delta') {
              // tool_use 的 JSON 参数增量拼接
              if (!block.input) block.input = ''
              block.input += parsed.delta.partial_json
            }
          }
          return
        }
        if (parsed.type === 'message_delta') {
          if (this.protocol === 'anthropic') {
            if (parsed.delta?.stop_reason) this.result.stop_reason = parsed.delta.stop_reason
            if (parsed.usage) this.result.usage = parsed.usage
          }
          return
        }
        if (parsed.type === 'message_stop') {
          this.completed = true
          return
        }

        // OpenAI 协议
        if (parsed.choices && Array.isArray(parsed.choices)) {
          this.protocol = 'openai'
          if (!this.result.choices) this.result.choices = []
          for (const choice of parsed.choices) {
            if (!this.result.choices[choice.index]) {
              this.result.choices[choice.index] = { message: { content: '', role: 'assistant' } }
            }
            const msg = this.result.choices[choice.index].message
            if (choice.delta?.content) {
              msg.content = (msg.content || '') + choice.delta.content
            }
            if (choice.finish_reason) {
              this.result.choices[choice.index].finish_reason = choice.finish_reason
            }
          }
          if (parsed.usage) this.result.usage = parsed.usage
          return
        }

        // Gemini 协议
        if (parsed.candidates && Array.isArray(parsed.candidates)) {
          this.protocol = 'gemini'
          this.result = { ...this.result, ...parsed }
          return
        }

        // 未知协议
        if (this.protocol === 'unknown') {
          console.warn(`[trace] Unknown SSE protocol, falling back to raw text mode: ${data.substring(0, 80)}`)
          this.result = { ...this.result, raw: [...((this.result.raw as any[]) || []), parsed] }
        }
      } catch {
        // 非 JSON 数据，忽略
      }
    }
  }

  feedBytes(chunk: Uint8Array): void {
    const text = new TextDecoder().decode(chunk)
    this.buffer += text
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''
    for (const line of lines) {
      this.feedLine(line)
    }
  }

  reconstruct(): ReassembledResponse | null {
    return Object.keys(this.result).length > 0 ? this.result : null
  }

  getEvents(): SSEEvent[] {
    return this.events
  }

  isCompleted(): boolean {
    return this.completed
  }
}