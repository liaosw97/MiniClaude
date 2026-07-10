import { describe, it, expect, vi } from 'vitest'
import { Bun, dlopen, Database } from '../../../src/compat/polyfills/bun-modules'

describe('bun-modules polyfill', () => {
  describe('Bun.sleep', () => {
    it('返回 Promise 并在指定时间后 resolve', async () => {
      vi.useFakeTimers()
      const promise = Bun.sleep(100)
      vi.advanceTimersByTime(100)
      await expect(promise).resolves.toBeUndefined()
      vi.useRealTimers()
    })
  })

  describe('Bun.file', () => {
    it('返回包含 text/json/arrayBuffer 方法的对象', () => {
      const file = Bun.file('/tmp/test.txt')
      expect(typeof file.text).toBe('function')
      expect(typeof file.json).toBe('function')
      expect(typeof file.arrayBuffer).toBe('function')
    })
  })

  describe('dlopen', () => {
    it('抛出不支持错误', () => {
      expect(() => dlopen()).toThrow('bun:ffi is not supported in Node.js mode')
    })
  })

  describe('Database', () => {
    it('构造函数抛出不支持错误', () => {
      expect(() => new Database()).toThrow('bun:sqlite is not supported in Node.js mode')
    })
  })
})
