import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock 所有外部依赖
vi.mock('chalk', () => ({
  default: {
    red: vi.fn((s: string) => s),
  },
}))

vi.mock('execa', () => ({
  execa: vi.fn(() => Promise.resolve({ stdout: '', failed: false })),
}))

vi.mock('fs/promises', () => ({
  stat: vi.fn(() => Promise.resolve({ mtimeMs: 0 })),
}))

vi.mock('lodash-es/memoize.js', () => ({
  default: vi.fn((fn: any) => {
    const memoized = (...args: any[]) => fn(...args)
    memoized.cache = { clear: vi.fn() }
    return memoized
  }),
}))

vi.mock('path', async () => {
  const actual = await vi.importActual('path')
  return { ...actual }
})

vi.mock('src/constants/oauth.js', () => ({
  CLAUDE_AI_PROFILE_SCOPE: 'user:profile',
}))

vi.mock('src/services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))

vi.mock('src/utils/model/providers.js', () => ({
  getAPIProvider: vi.fn(() => 'firstParty'),
}))

vi.mock('src/bootstrap/state.js', () => ({
  getIsNonInteractiveSession: vi.fn(() => false),
  preferThirdPartyAuthentication: vi.fn(() => false),
}))

vi.mock('src/services/mockRateLimits.js', () => ({
  getMockSubscriptionType: vi.fn(() => null),
  shouldUseMockSubscription: vi.fn(() => false),
}))

vi.mock('src/services/oauth/client.js', () => ({
  isOAuthTokenExpired: vi.fn(() => false),
  refreshOAuthToken: vi.fn(() => Promise.resolve(null)),
  shouldUseClaudeAIAuth: vi.fn(() => false),
}))

vi.mock('src/services/oauth/getOauthProfile.js', () => ({
  getOauthProfileFromOauthToken: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('src/utils/authFileDescriptor.js', () => ({
  getApiKeyFromFileDescriptor: vi.fn(() => null),
  getOAuthTokenFromFileDescriptor: vi.fn(() => null),
}))

vi.mock('src/utils/authPortable.js', () => ({
  maybeRemoveApiKeyFromMacOSKeychainThrows: vi.fn(() => Promise.resolve()),
  normalizeApiKeyForConfig: vi.fn((key: string) => key),
}))

vi.mock('src/utils/betas.js', () => ({
  clearBetasCaches: vi.fn(),
}))

vi.mock('src/utils/config.js', () => ({
  checkHasTrustDialogAccepted: vi.fn(() => true),
  getGlobalConfig: vi.fn(() => ({})),
  saveGlobalConfig: vi.fn(),
}))

vi.mock('src/utils/debug.js', () => ({
  logAntError: vi.fn(),
  logForDebugging: vi.fn(),
}))

vi.mock('src/utils/envUtils.js', () => ({
  getClaudeConfigHomeDir: vi.fn(() => '/test'),
  isBareMode: vi.fn(() => false),
  isEnvTruthy: vi.fn((v: string | undefined) => v === '1' || v === 'true'),
  isRunningOnHomespace: vi.fn(() => false),
}))

vi.mock('src/utils/errors.js', () => ({
  errorMessage: vi.fn((e: any) => String(e)),
}))

vi.mock('src/utils/execFileNoThrow.js', () => ({
  execSyncWithDefaults_DEPRECATED: vi.fn(() => ''),
}))

vi.mock('src/utils/lockfile.js', () => ({}))

vi.mock('src/utils/log.js', () => ({
  logError: vi.fn(),
}))

vi.mock('src/utils/secureStorage/index.js', () => ({
  getSecureStorage: vi.fn(() => null),
}))

vi.mock('src/utils/secureStorage/keychainPrefetch.js', () => ({
  clearLegacyApiKeyPrefetch: vi.fn(),
  getLegacyApiKeyPrefetchResult: vi.fn(() => null),
}))

vi.mock('src/utils/secureStorage/macOsKeychainHelpers.js', () => ({
  clearKeychainCache: vi.fn(),
  getMacOsKeychainStorageServiceName: vi.fn(() => 'test'),
  getUsername: vi.fn(() => 'test'),
}))

vi.mock('src/utils/settings/settings.js', () => ({
  getSettings_DEPRECATED: vi.fn(() => ({})),
  getSettingsForSource: vi.fn(() => ({})),
}))

vi.mock('src/utils/slowOperations.js', () => ({
  jsonParse: JSON.parse,
}))

vi.mock('src/utils/toolSchemaCache.js', () => ({
  clearToolSchemaCache: vi.fn(),
}))

import {
  calculateApiKeyHelperTTL,
  isClaudeAISubscriber,
  isCodexSubscriber,
  is1PApiCustomer,
  hasProfileScope,
  getSubscriptionName,
} from '../../src/utils/auth'

describe('auth', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('calculateApiKeyHelperTTL', () => {
    it('默认 TTL 为 5 分钟', () => {
      delete process.env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS
      expect(calculateApiKeyHelperTTL()).toBe(5 * 60 * 1000)
    })

    it('环境变量覆盖', () => {
      process.env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS = '60000'
      expect(calculateApiKeyHelperTTL()).toBe(60000)
    })

    it('环境变量为 0', () => {
      process.env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS = '0'
      expect(calculateApiKeyHelperTTL()).toBe(0)
    })

    it('环境变量无效 → 使用默认值', () => {
      process.env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS = 'abc'
      expect(calculateApiKeyHelperTTL()).toBe(5 * 60 * 1000)
    })

    it('环境变量为负数 → 使用默认值', () => {
      process.env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS = '-1000'
      expect(calculateApiKeyHelperTTL()).toBe(5 * 60 * 1000)
    })
  })

  describe('OAuth 存根函数', () => {
    it('isClaudeAISubscriber → false', () => {
      expect(isClaudeAISubscriber()).toBe(false)
    })

    it('isCodexSubscriber → false', () => {
      expect(isCodexSubscriber()).toBe(false)
    })

    it('hasProfileScope → false', () => {
      expect(hasProfileScope()).toBe(false)
    })
  })

  describe('is1PApiCustomer', () => {
    it('非 Claude.ai 订阅者 → true', () => {
      expect(is1PApiCustomer()).toBe(true)
    })
  })

  describe('getSubscriptionName', () => {
    it('默认返回 Claude API', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      expect(getSubscriptionName()).toBe('Claude API')
    })
  })
})
