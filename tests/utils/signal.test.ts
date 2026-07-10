import { describe, it, expect, vi } from 'vitest'
import { createSignal } from '../../src/utils/signal'

describe('createSignal', () => {
  it('订阅后收到通知', () => {
    const signal = createSignal()
    const listener = vi.fn()
    signal.subscribe(listener)
    signal.emit()
    expect(listener).toHaveBeenCalled()
  })

  it('多个订阅者', () => {
    const signal = createSignal()
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    signal.subscribe(listener1)
    signal.subscribe(listener2)
    signal.emit()
    expect(listener1).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
  })

  it('取消订阅', () => {
    const signal = createSignal()
    const listener = vi.fn()
    const unsubscribe = signal.subscribe(listener)
    unsubscribe()
    signal.emit()
    expect(listener).not.toHaveBeenCalled()
  })

  it('clear → 移除所有监听器', () => {
    const signal = createSignal()
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    signal.subscribe(listener1)
    signal.subscribe(listener2)
    signal.clear()
    signal.emit()
    expect(listener1).not.toHaveBeenCalled()
    expect(listener2).not.toHaveBeenCalled()
  })

  it('带参数的信号', () => {
    const signal = createSignal<[string, number]>()
    const listener = vi.fn()
    signal.subscribe(listener)
    signal.emit('test', 42)
    expect(listener).toHaveBeenCalledWith('test', 42)
  })

  it('无订阅者 → 不抛出异常', () => {
    const signal = createSignal()
    expect(() => signal.emit()).not.toThrow()
  })
})
