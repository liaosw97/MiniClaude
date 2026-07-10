import { describe, it, expect, vi } from 'vitest'
import { setCommandLifecycleListener, notifyCommandLifecycle } from '../../src/utils/commandLifecycle'

describe('commandLifecycle', () => {
  it('设置监听器后收到通知', () => {
    const listener = vi.fn()
    setCommandLifecycleListener(listener)
    notifyCommandLifecycle('test-uuid', 'started')
    expect(listener).toHaveBeenCalledWith('test-uuid', 'started')
    setCommandLifecycleListener(null)
  })

  it('设置监听器后收到完成通知', () => {
    const listener = vi.fn()
    setCommandLifecycleListener(listener)
    notifyCommandLifecycle('test-uuid', 'completed')
    expect(listener).toHaveBeenCalledWith('test-uuid', 'completed')
    setCommandLifecycleListener(null)
  })

  it('无监听器 → 不抛出异常', () => {
    setCommandLifecycleListener(null)
    expect(() => notifyCommandLifecycle('test-uuid', 'started')).not.toThrow()
  })

  it('设置 null → 移除监听器', () => {
    const listener = vi.fn()
    setCommandLifecycleListener(listener)
    setCommandLifecycleListener(null)
    notifyCommandLifecycle('test-uuid', 'started')
    expect(listener).not.toHaveBeenCalled()
  })
})
