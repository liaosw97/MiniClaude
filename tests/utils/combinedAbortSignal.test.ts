import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCombinedAbortSignal } from '../../src/utils/combinedAbortSignal'

describe('createCombinedAbortSignal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('无参数 → 返回 signal 和 cleanup', () => {
    const { signal, cleanup } = createCombinedAbortSignal(undefined)
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(typeof cleanup).toBe('function')
    cleanup()
  })

  it('signal 已中止 → 立即中止', () => {
    const controller = new AbortController()
    controller.abort()
    const { signal, cleanup } = createCombinedAbortSignal(controller.signal)
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  it('signalB 已中止 → 立即中止', () => {
    const controllerB = new AbortController()
    controllerB.abort()
    const { signal, cleanup } = createCombinedAbortSignal(undefined, {
      signalB: controllerB.signal,
    })
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  it('timeout → 超时后中止', () => {
    const { signal, cleanup } = createCombinedAbortSignal(undefined, {
      timeoutMs: 1000,
    })
    expect(signal.aborted).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  it('cleanup → 清除定时器', () => {
    const { signal, cleanup } = createCombinedAbortSignal(undefined, {
      timeoutMs: 1000,
    })
    cleanup()
    vi.advanceTimersByTime(1000)
    expect(signal.aborted).toBe(false)
  })

  it('signal 中途中止 → 触发中止', () => {
    const controller = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(controller.signal)
    controller.abort()
    expect(signal.aborted).toBe(true)
    cleanup()
  })
})
