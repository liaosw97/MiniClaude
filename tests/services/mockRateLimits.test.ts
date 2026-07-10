import { describe, it, expect } from 'vitest'
import {
  setMockHeader,
  addExceededLimit,
  setMockEarlyWarning,
  clearMockEarlyWarning,
  setMockRateLimitScenario,
  getMockHeaderless429Message,
  getMockHeaders,
  getMockStatus,
  clearMockHeaders,
  applyMockHeaders,
  shouldProcessMockLimits,
  getCurrentMockScenario,
  getScenarioDescription,
  setMockSubscriptionType,
  getMockSubscriptionType,
  shouldUseMockSubscription,
  setMockBillingAccess,
  isMockFastModeRateLimitScenario,
  checkMockFastModeRateLimit,
} from '../../src/services/mockRateLimits'

describe('mockRateLimits', () => {
  describe('存根函数返回值', () => {
    it('getMockHeaderless429Message → null', () => {
      expect(getMockHeaderless429Message()).toBeNull()
    })

    it('getMockHeaders → null', () => {
      expect(getMockHeaders()).toBeNull()
    })

    it('getMockStatus → disabled', () => {
      expect(getMockStatus()).toBe('disabled')
    })

    it('shouldProcessMockLimits → false', () => {
      expect(shouldProcessMockLimits()).toBe(false)
    })

    it('getCurrentMockScenario → null', () => {
      expect(getCurrentMockScenario()).toBeNull()
    })

    it('getMockSubscriptionType → null', () => {
      expect(getMockSubscriptionType()).toBeNull()
    })

    it('shouldUseMockSubscription → false', () => {
      expect(shouldUseMockSubscription()).toBe(false)
    })

    it('isMockFastModeRateLimitScenario → false', () => {
      expect(isMockFastModeRateLimitScenario()).toBe(false)
    })

    it('checkMockFastModeRateLimit → false', () => {
      expect(checkMockFastModeRateLimit()).toBe(false)
    })
  })

  describe('无副作用函数', () => {
    it('setMockHeader 不抛异常', () => {
      expect(() => setMockHeader('test')).not.toThrow()
    })

    it('addExceededLimit 不抛异常', () => {
      expect(() => addExceededLimit()).not.toThrow()
    })

    it('setMockEarlyWarning 不抛异常', () => {
      expect(() => setMockEarlyWarning()).not.toThrow()
    })

    it('clearMockEarlyWarning 不抛异常', () => {
      expect(() => clearMockEarlyWarning()).not.toThrow()
    })

    it('setMockRateLimitScenario 不抛异常', () => {
      expect(() => setMockRateLimitScenario('test')).not.toThrow()
    })

    it('clearMockHeaders 不抛异常', () => {
      expect(() => clearMockHeaders()).not.toThrow()
    })

    it('setMockSubscriptionType 不抛异常', () => {
      expect(() => setMockSubscriptionType()).not.toThrow()
    })

    it('setMockBillingAccess 不抛异常', () => {
      expect(() => setMockBillingAccess()).not.toThrow()
    })
  })

  describe('applyMockHeaders', () => {
    it('返回传入的 headers', () => {
      const headers = { 'Content-Type': 'application/json' }
      expect(applyMockHeaders(headers)).toBe(headers)
    })

    it('返回传入的 headers（不同类型）', () => {
      const headers = { Authorization: 'Bearer token' }
      expect(applyMockHeaders(headers)).toBe(headers)
    })
  })

  describe('getScenarioDescription', () => {
    it('返回空字符串', () => {
      expect(getScenarioDescription('any-scenario')).toBe('')
    })

    it('空字符串返回空字符串', () => {
      expect(getScenarioDescription('')).toBe('')
    })
  })
})
