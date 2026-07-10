import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('feature flags', () => {
  const originalFeatures = (globalThis as any).__FEATURES__

  afterEach(() => {
    if (originalFeatures === undefined) {
      delete (globalThis as any).__FEATURES__
    } else {
      ;(globalThis as any).__FEATURES__ = originalFeatures
    }
    vi.resetModules()
  })

  it('build-time flag 优先 → 返回 build-time 值', async () => {
    ;(globalThis as any).__FEATURES__ = { PROACTIVE: true }
    vi.resetModules()
    const { feature } = await import('../../src/compat/features')
    expect(feature('PROACTIVE')).toBe(true)
  })

  it('build-time flag 为 false → 返回 false', async () => {
    ;(globalThis as any).__FEATURES__ = { PROACTIVE: false }
    vi.resetModules()
    const { feature } = await import('../../src/compat/features')
    expect(feature('PROACTIVE')).toBe(false)
  })

  it('runtime flag → 返回 runtime 值', async () => {
    delete (globalThis as any).__FEATURES__
    vi.resetModules()
    const { feature, setFeatureFlags } = await import('../../src/compat/features')
    setFeatureFlags({ CUSTOM_FLAG: true })
    expect(feature('CUSTOM_FLAG')).toBe(true)
  })

  it('NODE_DEFAULTS → 返回默认值', async () => {
    delete (globalThis as any).__FEATURES__
    vi.resetModules()
    const { feature } = await import('../../src/compat/features')
    expect(feature('NODE_COMPAT')).toBe(true)
    expect(feature('BUN_BYTECODE')).toBe(false)
  })

  it('未知 flag → 返回 false', async () => {
    delete (globalThis as any).__FEATURES__
    vi.resetModules()
    const { feature } = await import('../../src/compat/features')
    expect(feature('UNKNOWN_FLAG')).toBe(false)
  })

  it('build-time 优先于 runtime', async () => {
    ;(globalThis as any).__FEATURES__ = { PROACTIVE: true }
    vi.resetModules()
    const { feature, setFeatureFlags } = await import('../../src/compat/features')
    setFeatureFlags({ PROACTIVE: false })
    expect(feature('PROACTIVE')).toBe(true)
  })

  it('getFeatureFlags → 合并 build-time 和 runtime', async () => {
    ;(globalThis as any).__FEATURES__ = { A: true }
    vi.resetModules()
    const { getFeatureFlags, setFeatureFlags } = await import('../../src/compat/features')
    setFeatureFlags({ B: true })
    const flags = getFeatureFlags()
    expect(flags.A).toBe(true)
    expect(flags.B).toBe(true)
  })

  it('setFeatureFlags → 合并而非覆盖', async () => {
    delete (globalThis as any).__FEATURES__
    vi.resetModules()
    const { feature, setFeatureFlags } = await import('../../src/compat/features')
    setFeatureFlags({ A: true })
    setFeatureFlags({ B: true })
    expect(feature('A')).toBe(true)
    expect(feature('B')).toBe(true)
  })
})
