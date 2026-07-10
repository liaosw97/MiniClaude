import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn().mockResolvedValue(''),
}))

describe('getPlatform', () => {
  const originalPlatform = process.platform

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    vi.resetModules()
  })

  it('darwin → macos', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    vi.resetModules()
    const { getPlatform } = await import('../../src/utils/platform')
    expect(getPlatform()).toBe('macos')
  })

  it('win32 → windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    vi.resetModules()
    const { getPlatform } = await import('../../src/utils/platform')
    expect(getPlatform()).toBe('windows')
  })

  it('linux（非 WSL）→ linux', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    vi.resetModules()
    const { getPlatform } = await import('../../src/utils/platform')
    expect(getPlatform()).toBe('linux')
  })

  it('其他平台 → unknown', async () => {
    Object.defineProperty(process, 'platform', { value: 'freebsd' })
    vi.resetModules()
    const { getPlatform } = await import('../../src/utils/platform')
    expect(getPlatform()).toBe('unknown')
  })
})

describe('getWslVersion', () => {
  const originalPlatform = process.platform

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    vi.resetModules()
  })

  it('非 linux → undefined', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    vi.resetModules()
    const { getWslVersion } = await import('../../src/utils/platform')
    expect(getWslVersion()).toBeUndefined()
  })
})
