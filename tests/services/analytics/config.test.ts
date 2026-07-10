import { describe, it, expect } from 'vitest'
import {
  isAnalyticsDisabled,
  isFeedbackSurveyDisabled,
  getAnalyticsConfig,
} from '../../../src/services/analytics/config'

describe('analytics/config', () => {
  describe('isAnalyticsDisabled', () => {
    it('返回 true', () => {
      expect(isAnalyticsDisabled()).toBe(true)
    })
  })

  describe('isFeedbackSurveyDisabled', () => {
    it('返回 true', () => {
      expect(isFeedbackSurveyDisabled()).toBe(true)
    })
  })

  describe('getAnalyticsConfig', () => {
    it('返回空对象', () => {
      expect(getAnalyticsConfig()).toEqual({})
    })

    it('返回的是新对象', () => {
      const config1 = getAnalyticsConfig()
      const config2 = getAnalyticsConfig()
      expect(config1).not.toBe(config2)
    })
  })
})
