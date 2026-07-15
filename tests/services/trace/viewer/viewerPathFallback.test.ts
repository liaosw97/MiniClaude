import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Top-level mocks that will be hoisted
const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  }
})

describe('traceServer viewer path resolution', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('viewer.html 不存在时应抛出错误', async () => {
    vi.resetModules()
    mockExistsSync.mockReturnValue(false)
    mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT') })

    vi.stubGlobal('Bun', {
      serve: vi.fn(),
      spawn: vi.fn(),
    })

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    await expect(startTraceServer({ port: 3990 })).rejects.toThrow()
  })

  it('开发模式下 viewer.html 可读时应成功启动', async () => {
    vi.resetModules()
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('<!DOCTYPE html><html></html>')

    vi.stubGlobal('Bun', {
      serve: vi.fn((options: any) => ({
        port: options.port ?? 3990,
        stop: vi.fn(),
      })),
      spawn: vi.fn(),
    })

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    const server = await startTraceServer({ port: 3991 })
    expect(server.port).toBe(3991)
    server.stop()
  })

  it('Node.js 模式下 viewer.html 可读时应成功启动', async () => {
    vi.resetModules()
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('<!DOCTYPE html><html></html>')

    const origBun = (globalThis as any).Bun
    delete (globalThis as any).Bun

    try {
      const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
      const server = await startTraceServer({ port: 3992 })
      expect(server.port).toBe(3992)
      server.stop()
    } finally {
      (globalThis as any).Bun = origBun
    }
  })

  it('viewer.html 文件读取失败应抛出异常', async () => {
    vi.resetModules()
    mockExistsSync.mockReturnValue(false)
    mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT') })

    vi.stubGlobal('Bun', {
      serve: vi.fn(),
      spawn: vi.fn(),
    })

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    await expect(startTraceServer({ port: 3993 })).rejects.toThrow()
  })

  it('Bun 模式下 server 应正确启动并返回端口', async () => {
    vi.resetModules()
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('<!DOCTYPE html><html></html>')

    vi.stubGlobal('Bun', {
      serve: vi.fn((options: any) => ({
        port: options.port ?? 3994,
        stop: vi.fn(),
      })),
      spawn: vi.fn(),
    })

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    const server = await startTraceServer({ port: 3994 })
    expect(server.port).toBe(3994)
    expect(typeof server.stop).toBe('function')
    server.stop()
  })
})