import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import after mocks
const { teamMemSavedPart } = await import('../../../src/components/messages/teamMemSaved.js')

describe('teamMemSaved', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('teamMemSavedPart', () => {
    it('当 teamCount 为 0 时应该返回 null', () => {
      const message = { teamCount: 0 }
      expect(teamMemSavedPart(message as any)).toBeNull()
    })

    it('当 teamCount 为 undefined 时应该返回 null', () => {
      const message = {}
      expect(teamMemSavedPart(message as any)).toBeNull()
    })

    it('当 teamCount 为 1 时应该返回单数形式', () => {
      const message = { teamCount: 1 }
      const result = teamMemSavedPart(message as any)

      expect(result).toEqual({
        segment: '1 team memory',
        count: 1,
      })
    })

    it('当 teamCount 为 2 时应该返回复数形式', () => {
      const message = { teamCount: 2 }
      const result = teamMemSavedPart(message as any)

      expect(result).toEqual({
        segment: '2 team memories',
        count: 2,
      })
    })

    it('当 teamCount 为 10 时应该返回复数形式', () => {
      const message = { teamCount: 10 }
      const result = teamMemSavedPart(message as any)

      expect(result).toEqual({
        segment: '10 team memories',
        count: 10,
      })
    })

    it('应该返回正确的 count', () => {
      const message = { teamCount: 5 }
      const result = teamMemSavedPart(message as any)

      expect(result?.count).toBe(5)
    })

    it('应该返回正确的 segment', () => {
      const message = { teamCount: 3 }
      const result = teamMemSavedPart(message as any)

      expect(result?.segment).toBe('3 team memories')
    })
  })
})
