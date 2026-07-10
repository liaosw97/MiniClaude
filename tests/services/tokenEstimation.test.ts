import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 外部依赖
vi.mock('src/utils/betas.js', () => ({
  getModelBetas: vi.fn(() => []),
}))

vi.mock('src/utils/log.js', () => ({
  logError: vi.fn(),
}))

vi.mock('src/utils/messages.js', () => ({
  normalizeAttachmentForAPI: vi.fn(() => []),
}))

vi.mock('src/utils/model/model.js', () => ({
  getMainLoopModel: vi.fn(() => 'claude-sonnet-4-6'),
  getSmallFastModel: vi.fn(() => 'claude-haiku-4-5'),
  normalizeModelStringForAPI: vi.fn((m: string) => m),
}))

vi.mock('src/utils/slowOperations.js', () => ({
  jsonStringify: JSON.stringify,
}))

vi.mock('src/utils/toolSearch.js', () => ({
  isToolReferenceBlock: vi.fn(() => false),
}))

vi.mock('src/services/api/claude.js', () => ({
  getAPIMetadata: vi.fn(() => ({})),
  getExtraBodyParams: vi.fn(() => ({})),
}))

vi.mock('src/services/api/client.js', () => ({
  getAnthropicClient: vi.fn(() => Promise.resolve({
    beta: {
      messages: {
        countTokens: vi.fn(() => Promise.resolve({ input_tokens: 100 })),
        create: vi.fn(() => Promise.resolve({
          usage: { input_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        })),
      },
    },
  })),
}))

vi.mock('src/services/vcr.js', () => ({
  withTokenCountVCR: vi.fn((_messages: any, _tools: any, fn: any) => fn()),
}))

import {
  roughTokenCountEstimation,
  bytesPerTokenForFileType,
  roughTokenCountEstimationForFileType,
  roughTokenCountEstimationForMessage,
  roughTokenCountEstimationForMessages,
} from '../../src/services/tokenEstimation'

describe('tokenEstimation', () => {
  describe('roughTokenCountEstimation', () => {
    it('默认 bytesPerToken=4 时计算正确', () => {
      expect(roughTokenCountEstimation('hello')).toBe(1) // 5/4 = 1.25 → 1
      expect(roughTokenCountEstimation('hello world')).toBe(3) // 11/4 = 2.75 → 3
    })

    it('空字符串返回 0', () => {
      expect(roughTokenCountEstimation('')).toBe(0)
    })

    it('自定义 bytesPerToken', () => {
      expect(roughTokenCountEstimation('hello', 2)).toBe(3) // 5/2 = 2.5 → 3
      expect(roughTokenCountEstimation('hello', 1)).toBe(5) // 5/1 = 5
    })

    it('长字符串', () => {
      const longStr = 'a'.repeat(1000)
      expect(roughTokenCountEstimation(longStr)).toBe(250) // 1000/4 = 250
    })
  })

  describe('bytesPerTokenForFileType', () => {
    it('json → 2', () => {
      expect(bytesPerTokenForFileType('json')).toBe(2)
    })

    it('jsonl → 2', () => {
      expect(bytesPerTokenForFileType('jsonl')).toBe(2)
    })

    it('jsonc → 2', () => {
      expect(bytesPerTokenForFileType('jsonc')).toBe(2)
    })

    it('ts → 4', () => {
      expect(bytesPerTokenForFileType('ts')).toBe(4)
    })

    it('js → 4', () => {
      expect(bytesPerTokenForFileType('js')).toBe(4)
    })

    it('未知扩展名 → 4', () => {
      expect(bytesPerTokenForFileType('xyz')).toBe(4)
    })

    it('空字符串 → 4', () => {
      expect(bytesPerTokenForFileType('')).toBe(4)
    })
  })

  describe('roughTokenCountEstimationForFileType', () => {
    it('JSON 文件使用 bytesPerToken=2', () => {
      const content = '{"key": "value"}'
      // 16 chars / 2 = 8
      expect(roughTokenCountEstimationForFileType(content, 'json')).toBe(8)
    })

    it('非 JSON 文件使用 bytesPerToken=4', () => {
      const content = 'const x = 1'
      // 11 chars / 4 = 2.75 → 3
      expect(roughTokenCountEstimationForFileType(content, 'ts')).toBe(3)
    })
  })

  describe('roughTokenCountEstimationForMessage', () => {
    it('assistant 消息带文本内容', () => {
      const message = {
        type: 'assistant',
        message: { content: 'hello world' },
      }
      expect(roughTokenCountEstimationForMessage(message)).toBe(3) // 11/4 = 2.75 → 3
    })

    it('user 消息带文本内容', () => {
      const message = {
        type: 'user',
        message: { content: 'test' },
      }
      expect(roughTokenCountEstimationForMessage(message)).toBe(1) // 4/4 = 1
    })

    it('无内容返回 0', () => {
      const message = {
        type: 'assistant',
        message: {},
      }
      expect(roughTokenCountEstimationForMessage(message)).toBe(0)
    })

    it('未知类型返回 0', () => {
      const message = {
        type: 'system',
        message: { content: 'hello' },
      }
      expect(roughTokenCountEstimationForMessage(message)).toBe(0)
    })

    it('attachment 类型', () => {
      const message = {
        type: 'attachment',
        attachment: { type: 'text', content: 'hello' },
      }
      // normalizeAttachmentForAPI returns [] in mock, so returns 0
      expect(roughTokenCountEstimationForMessage(message)).toBe(0)
    })
  })

  describe('roughTokenCountEstimationForMessages', () => {
    it('多个消息累加', () => {
      const messages = [
        { type: 'user', message: { content: 'hello' } },
        { type: 'assistant', message: { content: 'world' } },
      ]
      // "hello" = 5/4 = 1.25 → 1, "world" = 5/4 = 1.25 → 1
      expect(roughTokenCountEstimationForMessages(messages)).toBe(2)
    })

    it('空数组返回 0', () => {
      expect(roughTokenCountEstimationForMessages([])).toBe(0)
    })

    it('混合类型消息', () => {
      const messages = [
        { type: 'user', message: { content: 'test' } },
        { type: 'system' }, // 无内容
        { type: 'assistant', message: { content: 'response' } },
      ]
      // "test" = 4/4 = 1, "response" = 8/4 = 2
      expect(roughTokenCountEstimationForMessages(messages)).toBe(3)
    })
  })
})
