import { describe, it, expect, vi } from 'vitest'

// Mock 依赖
vi.mock('src/commands/review/ultrareviewEnabled.js', () => ({
  isUltrareviewEnabled: vi.fn(() => false),
}))

import review, { ultrareview } from '../../../src/commands/review'

describe('review 命令', () => {
  describe('review', () => {
    it('类型为 prompt', () => {
      expect(review.type).toBe('prompt')
    })

    it('名称为 review', () => {
      expect(review.name).toBe('review')
    })

    it('有描述', () => {
      expect(review.description).toBeTruthy()
    })

    it('getPromptForCommand 返回文本块', async () => {
      const result = await review.getPromptForCommand('123')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('text')
      expect((result[0] as any).text).toContain('123')
    })

    it('getPromptForCommand 包含审查指令', async () => {
      const result = await review.getPromptForCommand('')
      const text = (result[0] as any).text
      expect(text).toContain('code reviewer')
      expect(text).toContain('gh pr')
    })
  })

  describe('ultrareview', () => {
    it('类型为 local-jsx', () => {
      expect(ultrareview.type).toBe('local-jsx')
    })

    it('名称为 ultrareview', () => {
      expect(ultrareview.name).toBe('ultrareview')
    })

    it('有描述', () => {
      expect(ultrareview.description).toBeTruthy()
    })

    it('isEnabled 检查功能开关', async () => {
      const { isUltrareviewEnabled } = await import('src/commands/review/ultrareviewEnabled.js')
      vi.mocked(isUltrareviewEnabled).mockReturnValue(true)
      expect(ultrareview.isEnabled()).toBe(true)

      vi.mocked(isUltrareviewEnabled).mockReturnValue(false)
      expect(ultrareview.isEnabled()).toBe(false)
    })
  })
})
