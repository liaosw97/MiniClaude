import { describe, it, expect, vi, afterEach } from 'vitest'
import { isRunningWithBun, isInBundledMode } from '../../src/utils/bundledMode'

describe('isRunningWithBun', () => {
  const originalBun = process.versions.bun

  afterEach(() => {
    if (originalBun === undefined) {
      delete (process.versions as any).bun
    } else {
      ;(process.versions as any).bun = originalBun
    }
  })

  it('Bun 环境 → true', () => {
    ;(process.versions as any).bun = '1.0.0'
    expect(isRunningWithBun()).toBe(true)
  })

  it('非 Bun 环境 → false', () => {
    delete (process.versions as any).bun
    expect(isRunningWithBun()).toBe(false)
  })
})

describe('isInBundledMode', () => {
  const originalBun = (globalThis as any).Bun

  afterEach(() => {
    if (originalBun === undefined) {
      delete (globalThis as any).Bun
    } else {
      ;(globalThis as any).Bun = originalBun
    }
  })

  it('Bun 有 embeddedFiles → true', () => {
    ;(globalThis as any).Bun = { embeddedFiles: ['file1'] }
    expect(isInBundledMode()).toBe(true)
  })

  it('Bun 无 embeddedFiles → false', () => {
    ;(globalThis as any).Bun = {}
    expect(isInBundledMode()).toBe(false)
  })

  it('Bun 不存在 → false', () => {
    delete (globalThis as any).Bun
    expect(isInBundledMode()).toBe(false)
  })

  it('embeddedFiles 为空数组 → false', () => {
    ;(globalThis as any).Bun = { embeddedFiles: [] }
    expect(isInBundledMode()).toBe(false)
  })
})
