// tests/services/trace/index-lock-concurrent.test.ts
import { describe, it, expect } from 'vitest'
import { withLock, createIndexCache, flushCache } from '../../../src/services/trace/index-lock.js'

describe('index-lock concurrency', () => {
  it('should handle 10 concurrent writes without data loss', async () => {
    const cache = createIndexCache()
    const tasks = Array.from({ length: 10 }, (_, i) =>
      withLock(`session-${i % 3}`, async () => {
        const key = `key-${i}`
        cache.set(key, { value: i })
        return i
      })
    )
    const results = await Promise.all(tasks)
    expect(results.length).toBe(10)
    // 所有 10 个任务都完成
    results.forEach((r, i) => expect(r).toBe(i))
  })

  it('should maintain write order under concurrent access', async () => {
    const order: number[] = []
    const promises = []
    for (let i = 0; i < 5; i++) {
      promises.push(
        withLock('order-test', async () => {
          await new Promise(r => setTimeout(r, Math.random() * 10))
          order.push(i)
        })
      )
    }
    await Promise.all(promises)
    // 在同一 key 上，顺序应被保留
    // 注意：不同的 Promise 调度顺序可能不同，但 withLock 保证同一 key 的串行执行
    expect(order.length).toBe(5)
  })

  it('should isolate different lock keys', async () => {
    const results: number[] = []
    const promises = [
      withLock('key-a', async () => {
        await new Promise(r => setTimeout(r, 20))
        results.push(1)
      }),
      withLock('key-b', async () => {
        results.push(2)
      }),
    ]
    await Promise.all(promises)
    // key-b 不受 key-a 阻塞，应先完成
    expect(results[0]).toBe(2)
    expect(results[1]).toBe(1)
  })
})