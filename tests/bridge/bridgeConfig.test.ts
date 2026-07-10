import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import after mocks
const {
  getBridgeBaseUrlOverride,
  getBridgeTokenOverride,
} = await import('../../src/bridge/bridgeConfig.js')

describe('bridgeConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBridgeBaseUrlOverride', () => {
    it('应该返回 undefined', () => {
      expect(getBridgeBaseUrlOverride()).toBeUndefined()
    })
  })

  describe('getBridgeTokenOverride', () => {
    it('应该返回 undefined', () => {
      expect(getBridgeTokenOverride()).toBeUndefined()
    })
  })
})
