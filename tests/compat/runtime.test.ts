import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('detectRuntime', () => {
  it('should detect current runtime (node in vitest environment)', async () => {
    const mod = await import('../../src/compat/runtime')
    const runtime = mod.detectRuntime()
    // Vitest runs in Node.js, so runtime should be 'node'
    expect(runtime).toBe('node')
    expect(mod.isBun).toBe(false)
    expect(mod.isNode).toBe(true)
    expect(mod.isDeno).toBe(false)
  })

  it('should export correct types', async () => {
    const mod = await import('../../src/compat/runtime')
    expect(typeof mod.detectRuntime).toBe('function')
    expect(typeof mod.isBun).toBe('boolean')
    expect(typeof mod.isNode).toBe('boolean')
    expect(typeof mod.isDeno).toBe('boolean')
    expect(typeof mod.runtime).toBe('string')
  })
})

describe('detectRuntime with mock', () => {
  beforeEach(async () => {
    const mod = await import('../../src/compat/runtime')
    mod._clearMockRuntime()
  })

  afterEach(async () => {
    const mod = await import('../../src/compat/runtime')
    mod._clearMockRuntime()
  })

  it('should mock runtime as bun', async () => {
    const mod = await import('../../src/compat/runtime')
    mod._setMockRuntime('bun')
    expect(mod.detectRuntime()).toBe('bun')
  })

  it('should mock runtime as node', async () => {
    const mod = await import('../../src/compat/runtime')
    mod._setMockRuntime('node')
    expect(mod.detectRuntime()).toBe('node')
  })

  it('should mock runtime as deno', async () => {
    const mod = await import('../../src/compat/runtime')
    mod._setMockRuntime('deno')
    expect(mod.detectRuntime()).toBe('deno')
  })

  it('should mock runtime as unknown', async () => {
    const mod = await import('../../src/compat/runtime')
    mod._setMockRuntime('unknown')
    expect(mod.detectRuntime()).toBe('unknown')
  })
})