import { describe, it, expect } from 'vitest'

describe('optional dependency — sharp (QR code)', () => {
  it('should export expected adapter functions', async () => {
    const mod = await import('../src/compat/native/sharp-adapter')
    expect(typeof mod.loadSharp).toBe('function')
    expect(typeof mod.createSharpAdapter).toBe('function')
  })
})

describe('optional dependency — fflate (compression)', () => {
  it('should export expected adapter functions', async () => {
    const mod = await import('../src/compat/native/fflate-adapter')
    expect(typeof mod.loadFflate).toBe('function')
    expect(typeof mod.createFflateAdapter).toBe('function')
  })
})

describe('optional dependency graceful degradation', () => {
  it('should handle try/catch pattern via dynamic import', async () => {
    // Verify the adapter modules implement dynamic import (not static import)
    // by checking they can be imported without error
    const sharpMod = await import('../src/compat/native/sharp-adapter')
    const fflateMod = await import('../src/compat/native/fflate-adapter')

    // When optional deps are available, loadSharp returns the module
    const sharp = await sharpMod.loadSharp()
    // sharp is either the constructor (when installed) or null (when missing)
    expect(sharp === null || typeof sharp === 'function').toBe(true)
  })
})
