import { describe, it, expect, vi } from 'vitest'

vi.mock('sharp', () => {
  const mockSharp = vi.fn((buffer: Buffer) => ({
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(buffer),
  }))
  return { default: mockSharp }
})

import { loadSharp, createSharpAdapter } from '../../../src/compat/native/sharp-adapter'

describe('sharp-adapter', () => {
  describe('loadSharp', () => {
    it('返回 sharp 实例', async () => {
      const sharp = await loadSharp()
      expect(sharp).toBeDefined()
    })
  })

  describe('createSharpAdapter', () => {
    it('返回包含 resize/toBuffer 的 adapter', async () => {
      const buffer = Buffer.from('test')
      const adapter = await createSharpAdapter(buffer)
      expect(typeof adapter.resize).toBe('function')
      expect(typeof adapter.toBuffer).toBe('function')
    })

    it('resize 返回 adapter 支持链式调用', async () => {
      const buffer = Buffer.from('test')
      const adapter = await createSharpAdapter(buffer)
      const result = adapter.resize(100, 100)
      expect(result).toBe(adapter)
    })

    it('toBuffer 返回 Buffer', async () => {
      const buffer = Buffer.from('test')
      const adapter = await createSharpAdapter(buffer)
      const result = await adapter.toBuffer()
      expect(Buffer.isBuffer(result)).toBe(true)
    })
  })
})
