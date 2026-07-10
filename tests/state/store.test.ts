import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore, type Store } from '../../src/state/store'

describe('createStore', () => {
  it('返回包含 getState、setState、subscribe 的对象', () => {
    const store = createStore({ count: 0 })
    expect(store).toHaveProperty('getState')
    expect(store).toHaveProperty('setState')
    expect(store).toHaveProperty('subscribe')
    expect(typeof store.getState).toBe('function')
    expect(typeof store.setState).toBe('function')
    expect(typeof store.subscribe).toBe('function')
  })

  describe('getState', () => {
    it('返回初始状态', () => {
      const store = createStore({ count: 0, name: 'test' })
      expect(store.getState()).toEqual({ count: 0, name: 'test' })
    })
  })

  describe('setState', () => {
    it('更新状态', () => {
      const store = createStore({ count: 0 })
      store.setState(prev => ({ count: prev.count + 1 }))
      expect(store.getState().count).toBe(1)
    })

    it('多次更新', () => {
      const store = createStore({ count: 0 })
      store.setState(prev => ({ count: prev.count + 1 }))
      store.setState(prev => ({ count: prev.count + 1 }))
      store.setState(prev => ({ count: prev.count + 1 }))
      expect(store.getState().count).toBe(3)
    })

    it('相同状态不触发监听器', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()
      store.subscribe(listener)
      store.setState(prev => prev) // 返回相同对象
      expect(listener).not.toHaveBeenCalled()
    })

    it('新状态触发监听器', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()
      store.subscribe(listener)
      store.setState(() => ({ count: 1 }))
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('调用 onChange 回调', () => {
      const onChange = vi.fn()
      const store = createStore({ count: 0 }, onChange)
      store.setState(() => ({ count: 1 }))
      expect(onChange).toHaveBeenCalledWith({
        newState: { count: 1 },
        oldState: { count: 0 },
      })
    })
  })

  describe('subscribe', () => {
    it('返回取消订阅函数', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)
      expect(typeof unsubscribe).toBe('function')
    })

    it('取消订阅后不再接收通知', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)
      unsubscribe()
      store.setState(() => ({ count: 1 }))
      expect(listener).not.toHaveBeenCalled()
    })

    it('多个监听器都收到通知', () => {
      const store = createStore({ count: 0 })
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      store.subscribe(listener1)
      store.subscribe(listener2)
      store.setState(() => ({ count: 1 }))
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
    })

    it('取消一个监听器不影响其他', () => {
      const store = createStore({ count: 0 })
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const unsubscribe1 = store.subscribe(listener1)
      store.subscribe(listener2)
      unsubscribe1()
      store.setState(() => ({ count: 1 }))
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalledTimes(1)
    })
  })

  describe('Object.is 比较', () => {
    it('相同引用不触发更新', () => {
      const state = { count: 0 }
      const store = createStore(state)
      const listener = vi.fn()
      store.subscribe(listener)
      store.setState(() => state) // 返回相同引用
      expect(listener).not.toHaveBeenCalled()
    })

    it('不同引用触发更新', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()
      store.subscribe(listener)
      store.setState(() => ({ count: 0 })) // 不同引用，相同值
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })
})
