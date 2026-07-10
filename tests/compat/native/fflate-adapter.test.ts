import { describe, it, expect } from 'vitest'
import { loadFflate, createFflateAdapter } from '../../../src/compat/native/fflate-adapter'

describe('fflate-adapter', () => {
  describe('loadFflate', () => {
    it('返回 zipSync 和 unzipSync', async () => {
      const fflate = await loadFflate()
      expect(typeof fflate.zipSync).toBe('function')
      expect(typeof fflate.unzipSync).toBe('function')
    })
  })

  describe('createFflateAdapter', () => {
    it('返回包含 zip/unzip 的 adapter', async () => {
      const adapter = await createFflateAdapter()
      expect(typeof adapter.zip).toBe('function')
      expect(typeof adapter.unzip).toBe('function')
    })

    it('zip → unzip 往返正确', async () => {
      const adapter = await createFflateAdapter()
      const original = { 'test.txt': new TextEncoder().encode('hello') }
      const zipped = adapter.zip(original)
      const unzipped = adapter.unzip(zipped)
      expect(new TextDecoder().decode(unzipped['test.txt'])).toBe('hello')
    })
  })
})
