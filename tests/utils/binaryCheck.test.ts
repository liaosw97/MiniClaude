import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('src/utils/debug.js', () => ({
  logForDebugging: vi.fn(),
}))

vi.mock('src/utils/which.js', () => ({
  which: vi.fn(),
}))

import { isBinaryInstalled, clearBinaryCache } from '../../src/utils/binaryCheck'
import { which } from 'src/utils/which.js'

describe('isBinaryInstalled', () => {
  beforeEach(() => {
    clearBinaryCache()
    vi.mocked(which).mockReset()
  })

  it('空命令 → false', async () => {
    expect(await isBinaryInstalled('')).toBe(false)
  })

  it('纯空格 → false', async () => {
    expect(await isBinaryInstalled('   ')).toBe(false)
  })

  it('命令存在 → true', async () => {
    vi.mocked(which).mockResolvedValue('/usr/bin/git')
    expect(await isBinaryInstalled('git')).toBe(true)
  })

  it('命令不存在 → false', async () => {
    vi.mocked(which).mockRejectedValue(new Error('not found'))
    expect(await isBinaryInstalled('nonexistent')).toBe(false)
  })

  it('缓存命中 → 不重复调用 which', async () => {
    vi.mocked(which).mockResolvedValue('/usr/bin/git')
    await isBinaryInstalled('git')
    await isBinaryInstalled('git')
    expect(which).toHaveBeenCalledTimes(1)
  })

  it('clearBinaryCache → 清除缓存', async () => {
    vi.mocked(which).mockResolvedValue('/usr/bin/git')
    await isBinaryInstalled('git')
    clearBinaryCache()
    await isBinaryInstalled('git')
    expect(which).toHaveBeenCalledTimes(2)
  })
})
