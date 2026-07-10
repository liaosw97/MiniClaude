import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import after mocks
const { decodeJwtExpiry } = await import('../../src/bridge/jwtUtils.js')

describe('jwtUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('decodeJwtExpiry', () => {
    it('应该返回 null', () => {
      expect(decodeJwtExpiry('test-token')).toBeNull()
    })

    it('应该忽略参数', () => {
      expect(decodeJwtExpiry('')).toBeNull()
      expect(decodeJwtExpiry('any-token')).toBeNull()
    })
  })
})
