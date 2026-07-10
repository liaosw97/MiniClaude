import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 外部依赖
vi.mock('@anthropic-ai/sdk', () => ({
  APIConnectionError: class APIConnectionError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'APIConnectionError'
    }
  },
  APIConnectionTimeoutError: class APIConnectionTimeoutError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'APIConnectionTimeoutError'
    }
  },
  APIError: class APIError extends Error {
    status: number
    headers: any
    constructor(message: string, status: number) {
      super(message)
      this.name = 'APIError'
      this.status = status
      this.headers = {
        get: vi.fn(() => null),
      }
    }
  },
}))

vi.mock('src/constants/betas.js', () => ({
  AFK_MODE_BETA_HEADER: '',
}))

vi.mock('src/entrypoints/agentSdkTypes.js', () => ({}))

vi.mock('src/types/message.js', () => ({}))

vi.mock('src/utils/auth.js', () => ({
  getAnthropicApiKeyWithSource: vi.fn(() => ({ key: null, source: 'none' })),
  getClaudeAIOAuthTokens: vi.fn(() => null),
  getOauthAccountInfo: vi.fn(() => null),
  isClaudeAISubscriber: vi.fn(() => false),
}))

vi.mock('src/utils/messages.js', () => ({
  createAssistantAPIErrorMessage: vi.fn((opts: any) => ({
    type: 'assistant',
    isApiErrorMessage: true,
    message: { content: [{ type: 'text', text: opts.content }] },
    errorDetails: opts.errorDetails,
  })),
  NO_RESPONSE_REQUESTED: '[no response requested]',
}))

vi.mock('src/utils/model/model.js', () => ({
  getDefaultMainLoopModelSetting: vi.fn(() => 'claude-sonnet-4-6'),
  isNonCustomOpusModel: vi.fn(() => false),
}))

vi.mock('src/utils/model/modelStrings.js', () => ({
  getModelStrings: vi.fn(() => ({
    opus41: 'claude-opus-4-1-20250414',
    sonnet45: 'claude-sonnet-4-5-20250514',
    sonnet40: 'claude-sonnet-4-20250514',
  })),
}))

vi.mock('src/bootstrap/state.js', () => ({
  getIsNonInteractiveSession: vi.fn(() => false),
}))

vi.mock('src/constants/apiLimits.js', () => ({
  API_PDF_MAX_PAGES: 100,
  PDF_TARGET_RAW_SIZE: 10 * 1024 * 1024,
}))

vi.mock('src/utils/envUtils.js', () => ({
  isEnvTruthy: vi.fn(() => false),
}))

vi.mock('src/utils/format.js', () => ({
  formatFileSize: vi.fn((size: number) => `${size} bytes`),
}))

vi.mock('src/utils/imageResizer.js', () => ({
  ImageResizeError: class ImageResizeError extends Error {},
}))

vi.mock('src/utils/imageValidation.js', () => ({
  ImageSizeError: class ImageSizeError extends Error {},
}))

vi.mock('src/services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))

vi.mock('src/services/claudeAiLimits.js', () => ({
  getRateLimitErrorMessage: vi.fn(() => null),
}))

vi.mock('src/services/rateLimitMocking.js', () => ({
  shouldProcessRateLimits: vi.fn(() => false),
}))

vi.mock('src/services/api/errorUtils.js', () => ({
  extractConnectionErrorDetails: vi.fn(() => null),
  formatAPIError: vi.fn((error: any) => error.message),
}))

import {
  API_ERROR_MESSAGE_PREFIX,
  startsWithApiErrorPrefix,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  isPromptTooLongMessage,
  parsePromptTooLongTokenCounts,
  isMediaSizeError,
  isValidAPIMessage,
  classifyAPIError,
} from '../../../src/services/api/errors'

describe('api/errors', () => {
  describe('startsWithApiErrorPrefix', () => {
    it('以 API Error 开头 → true', () => {
      expect(startsWithApiErrorPrefix('API Error: something')).toBe(true)
    })

    it('以 login 前缀开头 → true', () => {
      expect(startsWithApiErrorPrefix('Please run /login · API Error: test')).toBe(true)
    })

    it('普通文本 → false', () => {
      expect(startsWithApiErrorPrefix('Hello world')).toBe(false)
    })

    it('空字符串 → false', () => {
      expect(startsWithApiErrorPrefix('')).toBe(false)
    })

    it('部分匹配 → false', () => {
      expect(startsWithApiErrorPrefix('Not API Error')).toBe(false)
    })
  })

  describe('isPromptTooLongMessage', () => {
    it('API 错误消息带 prompt too long → true', () => {
      const msg = {
        isApiErrorMessage: true,
        message: {
          content: [{ type: 'text', text: 'Prompt is too long' }],
        },
      }
      expect(isPromptTooLongMessage(msg as any)).toBe(true)
    })

    it('非 API 错误消息 → false', () => {
      const msg = {
        isApiErrorMessage: false,
        message: { content: [] },
      }
      expect(isPromptTooLongMessage(msg as any)).toBe(false)
    })

    it('内容不是数组 → false', () => {
      const msg = {
        isApiErrorMessage: true,
        message: { content: 'string content' },
      }
      expect(isPromptTooLongMessage(msg as any)).toBe(false)
    })
  })

  describe('parsePromptTooLongTokenCounts', () => {
    it('解析标准格式', () => {
      const result = parsePromptTooLongTokenCounts(
        'prompt is too long: 137500 tokens > 135000 maximum',
      )
      expect(result.actualTokens).toBe(137500)
      expect(result.limitTokens).toBe(135000)
    })

    it('解析大写格式', () => {
      const result = parsePromptTooLongTokenCounts(
        'Prompt is too long: 100000 tokens > 90000 maximum',
      )
      expect(result.actualTokens).toBe(100000)
      expect(result.limitTokens).toBe(90000)
    })

    it('无匹配 → undefined', () => {
      const result = parsePromptTooLongTokenCounts('some other error')
      expect(result.actualTokens).toBeUndefined()
      expect(result.limitTokens).toBeUndefined()
    })
  })

  describe('isMediaSizeError', () => {
    it('image exceeds maximum → true', () => {
      expect(isMediaSizeError('image exceeds 5 MB maximum')).toBe(true)
    })

    it('image dimensions exceed many-image → true', () => {
      expect(isMediaSizeError('image dimensions exceed many-image limit')).toBe(true)
    })

    it('maximum PDF pages → true', () => {
      expect(isMediaSizeError('maximum of 100 PDF pages')).toBe(true)
    })

    it('普通错误 → false', () => {
      expect(isMediaSizeError('some error')).toBe(false)
    })

    it('空字符串 → false', () => {
      expect(isMediaSizeError('')).toBe(false)
    })
  })

  describe('isValidAPIMessage', () => {
    it('有效消息 → true', () => {
      const msg = {
        content: [{ type: 'text', text: 'hello' }],
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 100 },
      }
      expect(isValidAPIMessage(msg)).toBe(true)
    })

    it('缺少 content → false', () => {
      const msg = { model: 'test', usage: {} }
      expect(isValidAPIMessage(msg)).toBe(false)
    })

    it('null → false', () => {
      expect(isValidAPIMessage(null)).toBe(false)
    })

    it('非对象 → false', () => {
      expect(isValidAPIMessage('string')).toBe(false)
    })
  })

  describe('classifyAPIError', () => {
    it('aborted → aborted', () => {
      const error = new Error('Request was aborted.')
      expect(classifyAPIError(error)).toBe('aborted')
    })

    it('prompt too long → prompt_too_long', () => {
      const error = new Error('Prompt is too long')
      expect(classifyAPIError(error)).toBe('prompt_too_long')
    })

    it('credit balance low → credit_balance_low', () => {
      const error = new Error('Your credit balance is too low')
      expect(classifyAPIError(error)).toBe('credit_balance_low')
    })

    it('x-api-key → invalid_api_key', () => {
      const error = new Error('Invalid x-api-key')
      expect(classifyAPIError(error)).toBe('invalid_api_key')
    })

    it('未知错误 → unknown', () => {
      const error = new Error('Something else')
      expect(classifyAPIError(error)).toBe('unknown')
    })
  })
})
