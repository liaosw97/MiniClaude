import { describe, it, expect } from 'vitest'
import {
  getMessages,
  extractSystem,
  getRequestTools,
  getModel,
  getMaxTokens,
  isStreaming,
  getUsage,
  getResponseOutput,
  getResponseId,
  getResponseRole,
  hasError,
  getError,
  extractText,
  extractToolUses,
  extractToolResults,
  extractThinking,
  hasImages,
  countChars,
} from '../../../../src/services/trace/viewer/src/viewer/data/normalize.js'

describe('请求体规范化', () => {
  describe('getMessages', () => {
    it('返回空数组当 null', () => {
      expect(getMessages(null)).toEqual([])
    })

    it('返回空数组当 undefined', () => {
      expect(getMessages(undefined)).toEqual([])
    })

    it('提取消息数组', () => {
      const messages = [{ role: 'user', content: 'hello' }]
      expect(getMessages({ messages } as any)).toEqual(messages)
    })

    it('返回空数组当无 messages 字段', () => {
      expect(getMessages({} as any)).toEqual([])
    })
  })

  describe('extractSystem', () => {
    it('返回空字符串当 null', () => {
      expect(extractSystem(null)).toBe('')
    })

    it('提取 Anthropic system 字段 (字符串)', () => {
      expect(extractSystem({ system: 'prompt' } as any)).toBe('prompt')
    })

    it('提取 Anthropic system 字段 (数组)', () => {
      const system = [{ type: 'text', text: 'prompt' }]
      expect(extractSystem({ system } as any)).toEqual(system)
    })

    it('从 OpenAI 格式提取 system 消息', () => {
      const request = {
        messages: [
          { role: 'system', content: 'system prompt' },
          { role: 'user', content: 'hello' },
        ],
      }
      expect(extractSystem(request as any)).toBe('system prompt')
    })

    it('返回空字符串当无 system', () => {
      expect(extractSystem({ messages: [] } as any)).toBe('')
    })
  })

  describe('getRequestTools', () => {
    it('返回空数组当 null', () => {
      expect(getRequestTools(null)).toEqual([])
    })

    it('提取工具定义', () => {
      const tools = [{ name: 'bash' }]
      expect(getRequestTools({ tools } as any)).toEqual(tools)
    })
  })

  describe('getModel', () => {
    it('返回 unknown 当 null', () => {
      expect(getModel(null)).toBe('unknown')
    })

    it('提取 model', () => {
      expect(getModel({ model: 'claude-opus-4-6' } as any)).toBe('claude-opus-4-6')
    })

    it('返回 unknown 当无 model', () => {
      expect(getModel({} as any)).toBe('unknown')
    })
  })

  describe('getMaxTokens', () => {
    it('返回 undefined 当 null', () => {
      expect(getMaxTokens(null)).toBeUndefined()
    })

    it('提取 max_tokens', () => {
      expect(getMaxTokens({ max_tokens: 4096 } as any)).toBe(4096)
    })
  })

  describe('isStreaming', () => {
    it('返回 false 当 null', () => {
      expect(isStreaming(null)).toBe(false)
    })

    it('返回 true 当 stream 为 true', () => {
      expect(isStreaming({ stream: true } as any)).toBe(true)
    })

    it('返回 false 当无 stream', () => {
      expect(isStreaming({} as any)).toBe(false)
    })
  })
})

describe('响应体规范化', () => {
  describe('getUsage', () => {
    it('返回 undefined 当 null', () => {
      expect(getUsage(null)).toBeUndefined()
    })

    it('提取 usage', () => {
      const usage = { input_tokens: 100, output_tokens: 50 }
      expect(getUsage({ usage } as any)).toEqual(usage)
    })
  })

  describe('getResponseOutput', () => {
    it('返回空数组当 null', () => {
      expect(getResponseOutput(null)).toEqual([])
    })

    it('提取 Anthropic content', () => {
      const content = [{ type: 'text', text: 'hello' }]
      expect(getResponseOutput({ content } as any)).toEqual(content)
    })

    it('提取 OpenAI choices', () => {
      const response = {
        choices: [{ message: { content: 'hello' } }],
      }
      const result = getResponseOutput(response as any)
      expect(result).toEqual([{ type: 'text', text: 'hello' }])
    })

    it('处理 OpenAI 数组 content', () => {
      const response = {
        choices: [{ message: { content: [{ type: 'text', text: 'hi' }] } }],
      }
      expect(getResponseOutput(response as any)).toEqual([{ type: 'text', text: 'hi' }])
    })

    it('返回空数组当无 content', () => {
      expect(getResponseOutput({} as any)).toEqual([])
    })
  })

  describe('getResponseId', () => {
    it('返回空字符串当 null', () => {
      expect(getResponseId(null)).toBe('')
    })

    it('提取 id', () => {
      expect(getResponseId({ id: 'msg_123' } as any)).toBe('msg_123')
    })
  })

  describe('getResponseRole', () => {
    it('返回 assistant 当 null', () => {
      expect(getResponseRole(null)).toBe('assistant')
    })

    it('提取 role', () => {
      expect(getResponseRole({ role: 'assistant' } as any)).toBe('assistant')
    })
  })

  describe('hasError', () => {
    it('返回 false 当 null', () => {
      expect(hasError(null)).toBe(false)
    })

    it('返回 true 当有 error', () => {
      expect(hasError({ error: { type: 'error', message: 'fail' } } as any)).toBe(true)
    })

    it('返回 false 当无 error', () => {
      expect(hasError({} as any)).toBe(false)
    })
  })

  describe('getError', () => {
    it('返回 null 当 null', () => {
      expect(getError(null)).toBeNull()
    })

    it('提取错误信息', () => {
      const response = {
        error: { type: 'api_error', message: 'rate limited', code: '429' },
      }
      expect(getError(response as any)).toEqual({
        type: 'api_error',
        message: 'rate limited',
        code: '429',
      })
    })

    it('返回 null 当无 error', () => {
      expect(getError({} as any)).toBeNull()
    })
  })
})

describe('内容块工具', () => {
  describe('extractText', () => {
    it('提取文本块', () => {
      const blocks = [
        { type: 'text', text: 'hello' },
        { type: 'tool_use', id: '1', name: 'bash', input: {} },
        { type: 'text', text: 'world' },
      ]
      expect(extractText(blocks as any)).toBe('hello\nworld')
    })

    it('返回空字符串当无文本', () => {
      expect(extractText([])).toBe('')
    })
  })

  describe('extractToolUses', () => {
    it('提取工具调用', () => {
      const blocks = [
        { type: 'text', text: 'hi' },
        { type: 'tool_use', id: '1', name: 'bash', input: {} },
      ]
      const result = extractToolUses(blocks as any)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('tool_use')
    })
  })

  describe('extractToolResults', () => {
    it('提取工具结果', () => {
      const blocks = [
        { type: 'tool_result', tool_use_id: '1', content: 'ok' },
        { type: 'text', text: 'hi' },
      ]
      const result = extractToolResults(blocks as any)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('tool_result')
    })
  })

  describe('extractThinking', () => {
    it('提取 thinking 块', () => {
      const blocks = [
        { type: 'thinking', thinking: 'let me think' },
        { type: 'text', text: 'answer' },
      ]
      expect(extractThinking(blocks as any)).toBe('let me think')
    })

    it('返回空字符串当无 thinking', () => {
      expect(extractThinking([])).toBe('')
    })
  })

  describe('hasImages', () => {
    it('返回 true 当有图片', () => {
      const blocks = [{ type: 'image', source: {} }]
      expect(hasImages(blocks as any)).toBe(true)
    })

    it('返回 false 当无图片', () => {
      expect(hasImages([{ type: 'text', text: 'hi' }] as any)).toBe(false)
    })
  })

  describe('countChars', () => {
    it('计算文本字符数', () => {
      const blocks = [
        { type: 'text', text: 'hello' },
        { type: 'thinking', thinking: 'world' },
      ]
      expect(countChars(blocks as any)).toBe(10)
    })

    it('计算 tool_result 字符数', () => {
      const blocks = [{ type: 'tool_result', content: 'output' }]
      expect(countChars(blocks as any)).toBe(6)
    })

    it('返回 0 当空数组', () => {
      expect(countChars([])).toBe(0)
    })
  })
})
