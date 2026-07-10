import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import after mocks
const {
  FAILED_FOOTER_TEXT,
  buildActiveFooterText,
  buildIdleFooterText,
  getBridgeStatus,
  buildBridgeConnectUrl,
  computeGlimmerIndex,
  computeShimmerSegments,
  SHIMMER_INTERVAL_MS,
} = await import('../../src/bridge/bridgeStatusUtil.js')

describe('bridgeStatusUtil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('常量', () => {
    it('FAILED_FOOTER_TEXT 应该是空字符串', () => {
      expect(FAILED_FOOTER_TEXT).toBe('')
    })

    it('SHIMMER_INTERVAL_MS 应该是 200', () => {
      expect(SHIMMER_INTERVAL_MS).toBe(200)
    })
  })

  describe('buildActiveFooterText', () => {
    it('应该返回空字符串', () => {
      expect(buildActiveFooterText()).toBe('')
    })
  })

  describe('buildIdleFooterText', () => {
    it('应该返回空字符串', () => {
      expect(buildIdleFooterText()).toBe('')
    })
  })

  describe('getBridgeStatus', () => {
    it('应该返回 disconnected 状态', () => {
      const result = getBridgeStatus()
      expect(result).toEqual({ status: 'disconnected' })
    })
  })

  describe('buildBridgeConnectUrl', () => {
    it('应该返回 null', () => {
      expect(buildBridgeConnectUrl()).toBeNull()
    })
  })

  describe('computeGlimmerIndex', () => {
    it('应该返回 -100', () => {
      expect(computeGlimmerIndex(0, 0)).toBe(-100)
    })

    it('应该忽略参数', () => {
      expect(computeGlimmerIndex(100, 200)).toBe(-100)
    })
  })

  describe('computeShimmerSegments', () => {
    it('应该返回空数组', () => {
      expect(computeShimmerSegments('test', 0)).toEqual([])
    })

    it('应该忽略参数', () => {
      expect(computeShimmerSegments('hello', 100)).toEqual([])
    })
  })
})
