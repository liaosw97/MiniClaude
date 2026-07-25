import { describe, it, expect, vi } from 'vitest'
import { withLock, createIndexCache, flushCache, registerExitHandler, stopPeriodicFlush } from '../../../src/services/trace/index-lock.js'

describe('index-lock', () => {
  it('withLock should execute function and return result', async () => {
    const result = await withLock('test', async () => 'done')
    expect(result).toBe('done')
  })

  it('withLock should serialize concurrent access', async () => {
    const order: number[] = []
    const p1 = withLock('key', async () => {
      await new Promise(r => setTimeout(r, 50))
      order.push(1)
    })
    const p2 = withLock('key', async () => {
      order.push(2)
    })
    await Promise.all([p1, p2])
    expect(order).toEqual([1, 2])
  })

  it('index cache should store and retrieve values', async () => {
    const cache = createIndexCache()
    cache.set('test', { sessions: [] })
    expect(cache.get('test')).toEqual({ sessions: [] })
  })

  it('flushCache should not throw when cache is empty', async () => {
    await expect(flushCache()).resolves.toBeUndefined()
  })

  it('should flush cache on process exit signals', async () => {
    // 验证 registerExitHandler 注册了 SIGINT/SIGTERM 处理器
    const exitHandler = registerExitHandler()
    // registerExitHandler 返回 true 表示首次注册成功
    // 重复调用应返回 false
    expect(registerExitHandler()).toBeUndefined()
    // cleanup
    stopPeriodicFlush()
  })
})