import { describe, it, expect, vi } from 'vitest'
import { registerCleanup, runCleanupFunctions } from '../../src/utils/cleanupRegistry'

describe('registerCleanup', () => {
  it('注册清理函数', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    registerCleanup(fn)
    await runCleanupFunctions()
    expect(fn).toHaveBeenCalled()
  })

  it('返回取消注册函数', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    const unregister = registerCleanup(fn)
    unregister()
    await runCleanupFunctions()
    expect(fn).not.toHaveBeenCalled()
  })

  it('多个清理函数全部执行', async () => {
    const fn1 = vi.fn().mockResolvedValue(undefined)
    const fn2 = vi.fn().mockResolvedValue(undefined)
    registerCleanup(fn1)
    registerCleanup(fn2)
    await runCleanupFunctions()
    expect(fn1).toHaveBeenCalled()
    expect(fn2).toHaveBeenCalled()
  })
})

describe('runCleanupFunctions', () => {
  it('无注册函数 → 不抛出异常', async () => {
    await expect(runCleanupFunctions()).resolves.toBeUndefined()
  })

  it('清理函数抛出异常 → 不阻塞其他函数', async () => {
    const fn1 = vi.fn().mockRejectedValue(new Error('fail'))
    const fn2 = vi.fn().mockResolvedValue(undefined)
    registerCleanup(fn1)
    registerCleanup(fn2)
    // Promise.all 会 reject，但不影响测试
    await runCleanupFunctions().catch(() => {})
    expect(fn2).toHaveBeenCalled()
  })
})
