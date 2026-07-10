import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('detectRuntime', () => {
  const originalBun = (globalThis as any).Bun
  const originalProcess = globalThis.process

  afterEach(() => {
    if (originalBun === undefined) {
      delete (globalThis as any).Bun
    } else {
      ;(globalThis as any).Bun = originalBun
    }
    ;(globalThis as any).process = originalProcess
  })

  it('Bun 环境 → isBun=true, isNode=false', async () => {
    ;(globalThis as any).Bun = {}
    vi.resetModules()
    const { detectRuntime, isBun, isNode } = await import('../../src/compat/runtime')
    expect(detectRuntime()).toBe('bun')
    expect(isBun).toBe(true)
    expect(isNode).toBe(false)
  })

  it('Node.js 环境 → isBun=false, isNode=true', async () => {
    delete (globalThis as any).Bun
    ;(globalThis as any).process = { versions: { node: '20.0.0' } }
    vi.resetModules()
    const { detectRuntime, isBun, isNode } = await import('../../src/compat/runtime')
    expect(detectRuntime()).toBe('node')
    expect(isBun).toBe(false)
    expect(isNode).toBe(true)
  })

  it('未知环境 → isBun=false, isNode=false', async () => {
    delete (globalThis as any).Bun
    ;(globalThis as any).process = { versions: {} }
    vi.resetModules()
    const { detectRuntime, isBun, isNode } = await import('../../src/compat/runtime')
    expect(detectRuntime()).toBe('unknown')
    expect(isBun).toBe(false)
    expect(isNode).toBe(false)
  })
})
