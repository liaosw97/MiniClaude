import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 简化 mock - 只 mock 必要的依赖
vi.mock('src/constants/prompts.js', () => ({
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY: '---DYNAMIC---',
}))

vi.mock('src/context.js', () => ({
  getSystemContext: vi.fn(() => ({})),
  getUserContext: vi.fn(() => ({})),
}))

vi.mock('src/services/analytics/config.js', () => ({
  isAnalyticsDisabled: vi.fn(() => true),
}))

vi.mock('src/services/analytics/growthbook.js', () => ({
  checkStatsigFeatureGate_CACHED_MAY_BE_STALE: vi.fn(() => false),
  getFeatureValue_CACHED_MAY_BE_STALE: vi.fn(() => false),
}))

vi.mock('src/services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))

vi.mock('src/services/mcp/client.js', () => ({
  prefetchAllMcpResources: vi.fn(() => Promise.resolve({ tools: [] })),
}))

vi.mock('src/tools.js', () => ({
  getTools: vi.fn(() => Promise.resolve([])),
}))

vi.mock('src/utils/agentSwarmsEnabled.js', () => ({
  isAgentSwarmsEnabled: vi.fn(() => false),
}))

vi.mock('src/utils/betas.js', () => ({
  modelSupportsStructuredOutputs: vi.fn(() => false),
  shouldUseGlobalCacheScope: vi.fn(() => false),
}))

vi.mock('src/utils/cwd.js', () => ({
  getCwd: vi.fn(() => '/test'),
}))

vi.mock('src/utils/debug.js', () => ({
  logForDebugging: vi.fn(),
}))

vi.mock('src/utils/envUtils.js', () => ({
  isEnvTruthy: vi.fn((v: string | undefined) => v === '1' || v === 'true'),
}))

vi.mock('src/utils/messages.js', () => ({
  createUserMessage: vi.fn((opts: any) => ({ role: 'user', content: opts.content })),
}))

vi.mock('src/utils/model/providers.js', () => ({
  getAPIProvider: vi.fn(() => 'firstParty'),
  isFirstPartyAnthropicBaseUrl: vi.fn(() => true),
}))

vi.mock('src/utils/permissions/filesystem.js', () => ({
  getFileReadIgnorePatterns: vi.fn(() => ({})),
  normalizePatternsToPath: vi.fn(() => []),
}))

vi.mock('src/utils/plans.js', () => ({
  getPlan: vi.fn(() => null),
  getPlanFilePath: vi.fn(() => null),
  persistFileSnapshotIfRemote: vi.fn(),
}))

vi.mock('src/utils/platform.js', () => ({
  getPlatform: vi.fn(() => 'linux'),
}))

vi.mock('src/utils/ripgrep.js', () => ({
  countFilesRoundedRg: vi.fn(() => Promise.resolve(10)),
}))

vi.mock('src/utils/slowOperations.js', () => ({
  jsonStringify: JSON.stringify,
}))

vi.mock('src/utils/toolSchemaCache.js', () => ({
  getToolSchemaCache: vi.fn(() => new Map()),
}))

vi.mock('src/utils/windowsPaths.js', () => ({
  windowsPathToPosixPath: vi.fn((p: string) => p),
}))

vi.mock('src/utils/zodToJsonSchema.js', () => ({
  zodToJsonSchema: vi.fn(() => ({})),
}))

vi.mock('src/services/tokenEstimation.js', () => ({
  roughTokenCountEstimation: vi.fn(() => 100),
}))

vi.mock('src/constants/system.js', () => ({
  CLI_SYSPROMPT_PREFIXES: new Set(['prefix1', 'prefix2']),
}))

// Mock 整个组件目录避免依赖问题
vi.mock('src/components/messages/RateLimitMessage.tsx', () => ({}))
vi.mock('src/components/messages/AssistantTextMessage.tsx', () => ({}))

import {
  appendSystemContext,
  prependUserContext,
} from '../../src/utils/api'

describe('api', () => {
  describe('appendSystemContext', () => {
    it('追加上下文到系统提示', () => {
      const systemPrompt = ['prompt1', 'prompt2']
      const context = { key1: 'value1', key2: 'value2' }
      const result = appendSystemContext(systemPrompt, context)
      expect(result).toContain('prompt1')
      expect(result).toContain('prompt2')
      expect(result.some(s => s.includes('key1: value1'))).toBe(true)
      expect(result.some(s => s.includes('key2: value2'))).toBe(true)
    })

    it('空上下文 → 返回原提示', () => {
      const systemPrompt = ['prompt1']
      const result = appendSystemContext(systemPrompt, {})
      expect(result).toEqual(['prompt1'])
    })

    it('过滤空字符串', () => {
      const systemPrompt = ['prompt1', '', 'prompt2']
      const context = { key: 'value' }
      const result = appendSystemContext(systemPrompt, context)
      expect(result.every(s => s !== '')).toBe(true)
    })
  })

  describe('prependUserContext', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('test 环境 → 返回原消息', () => {
      process.env.NODE_ENV = 'test'
      const messages = [{ role: 'user' as const, content: 'hello' }]
      const result = prependUserContext(messages, { key: 'value' })
      expect(result).toEqual(messages)
    })

    it('空上下文 → 返回原消息', () => {
      process.env.NODE_ENV = 'production'
      const messages = [{ role: 'user' as const, content: 'hello' }]
      const result = prependUserContext(messages, {})
      expect(result).toEqual(messages)
    })

    it('有上下文 → 前置系统消息', () => {
      process.env.NODE_ENV = 'production'
      const messages = [{ role: 'user' as const, content: 'hello' }]
      const result = prependUserContext(messages, { key: 'value' })
      expect(result.length).toBe(2)
      expect(result[0].role).toBe('user')
      expect(result[0].content).toContain('key')
      expect(result[0].content).toContain('value')
    })
  })
})
