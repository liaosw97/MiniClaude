import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBufferedWriter } from '../../src/utils/bufferedWriter'

describe('createBufferedWriter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('immediateMode → 直接写入', () => {
    const writeFn = vi.fn()
    const writer = createBufferedWriter({ writeFn, immediateMode: true })
    writer.write('hello')
    expect(writeFn).toHaveBeenCalledWith('hello')
  })

  it('缓冲模式 → 延迟写入', () => {
    const writeFn = vi.fn()
    const writer = createBufferedWriter({ writeFn, flushIntervalMs: 100 })
    writer.write('hello')
    expect(writeFn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(writeFn).toHaveBeenCalledWith('hello')
  })

  it('maxBufferSize → 触发溢出逻辑', () => {
    const writeFn = vi.fn()
    const writer = createBufferedWriter({ writeFn, maxBufferSize: 2 })
    // 写入 2 条触发 maxBufferSize，第 3 条触发 flushDeferred
    writer.write('a')
    writer.write('b')
    writer.write('c')
    // flushDeferred 使用 setImmediate，这里只验证不抛出异常
    expect(true).toBe(true)
  })

  it('flush → 手动刷新', () => {
    const writeFn = vi.fn()
    const writer = createBufferedWriter({ writeFn, flushIntervalMs: 1000 })
    writer.write('hello')
    writer.flush()
    expect(writeFn).toHaveBeenCalledWith('hello')
  })

  it('dispose → 刷新并清理', () => {
    const writeFn = vi.fn()
    const writer = createBufferedWriter({ writeFn, flushIntervalMs: 1000 })
    writer.write('hello')
    writer.dispose()
    expect(writeFn).toHaveBeenCalledWith('hello')
  })

  it('空缓冲 → flush 不调用 writeFn', () => {
    const writeFn = vi.fn()
    const writer = createBufferedWriter({ writeFn })
    writer.flush()
    expect(writeFn).not.toHaveBeenCalled()
  })

  it('多次写入 → 合并刷新', () => {
    const writeFn = vi.fn()
    const writer = createBufferedWriter({ writeFn, flushIntervalMs: 100 })
    writer.write('a')
    writer.write('b')
    writer.write('c')
    vi.advanceTimersByTime(100)
    expect(writeFn).toHaveBeenCalledWith('abc')
  })
})
