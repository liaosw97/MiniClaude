import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sleep } from '../../src/utils/sleep'

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('正常 sleep → 延迟后 resolve', async () => {
    const promise = sleep(100)
    vi.advanceTimersByTime(100)
    await expect(promise).resolves.toBeUndefined()
  })

  it('signal 已中止 → 立即 resolve', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(sleep(100, controller.signal)).resolves.toBeUndefined()
  })

  it('signal 已中止 + throwOnAbort → reject', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(sleep(100, controller.signal, { throwOnAbort: true })).rejects.toThrow('aborted')
  })

  it('signal 已中止 + abortError → reject 自定义错误', async () => {
    const controller = new AbortController()
    controller.abort()
    const customError = new Error('custom')
    await expect(
      sleep(100, controller.signal, { abortError: () => customError }),
    ).rejects.toBe(customError)
  })

  it('signal 中途中止 → 立即 resolve', async () => {
    const controller = new AbortController()
    const promise = sleep(1000, controller.signal)
    controller.abort()
    await expect(promise).resolves.toBeUndefined()
  })
})
