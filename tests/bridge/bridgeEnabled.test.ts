import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import after mocks
const {
  isBridgeEnabled,
  getBridgeDisabledReason,
  isCcrMirrorEnabled,
} = await import('../../src/bridge/bridgeEnabled.js')

describe('bridgeEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isBridgeEnabled', () => {
    it('应该返回 false', () => {
      expect(isBridgeEnabled()).toBe(false)
    })
  })

  describe('getBridgeDisabledReason', () => {
    it('应该返回 null', () => {
      expect(getBridgeDisabledReason()).toBeNull()
    })
  })

  describe('isCcrMirrorEnabled', () => {
    it('应该返回 false', () => {
      expect(isCcrMirrorEnabled()).toBe(false)
    })
  })
})
