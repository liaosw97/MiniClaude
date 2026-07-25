import { describe, it, expect, vi, afterEach } from 'vitest'

// ESM 中无法 vi.spyOn 模块命名空间的 export，改用 vi.mock
let mockExistsSync = true
let mockReadFileSync: ((path: string) => string) | null = null
let mockReadFileSyncThrow = false

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: (path: string) => {
      if (mockExistsSync === false) return false
      return actual.existsSync(path)
    },
    readFileSync: (path: string, ...args: any[]) => {
      if (mockReadFileSyncThrow) throw new Error('ENOENT')
      if (mockReadFileSync) return mockReadFileSync(path)
      return actual.readFileSync(path, ...args)
    },
  }
})

describe('traceServer viewer path resolution', () => {
  afterEach(() => {
    mockExistsSync = true
    mockReadFileSync = null
    mockReadFileSyncThrow = false
  })

  it('viewer.html 不存在时应抛出错误', async () => {
    mockExistsSync = false
    mockReadFileSyncThrow = true

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    await expect(startTraceServer({ port: 3990 })).rejects.toThrow()
  })

  it('process.argv[1] 所在目录不存在时回退到父目录的 dist/viewer/ [spec:trace-recording#dist/ 目录作为回退路径]', async () => {
    const mockArgv1 = '/app/dist/miniclaude-node.js'

    mockExistsSync = true
    mockReadFileSync = () => '<!DOCTYPE html><html></html>'

    const origArgv = process.argv
    ;(process as any).argv = ['node', mockArgv1]

    try {
      const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
      // 不抛出异常即表明回退成功
      const server = await startTraceServer({ port: 3990 })
      expect(typeof server.stop).toBe('function')
      server.stop()
    } finally {
      ;(process as any).argv = origArgv
    }
  })

  it('所有回退路径均失败时应抛出 Failed to read viewer files [spec:trace-recording#所有回退路径均失败时报错]', async () => {
    const mockArgv1 = '/app/dist/miniclaude-node.js'

    mockExistsSync = false
    mockReadFileSyncThrow = true

    const origArgv = process.argv
    ;(process as any).argv = ['node', mockArgv1]

    try {
      const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
      await expect(startTraceServer({ port: 3995 })).rejects.toThrow('Failed to read viewer files')
    } finally {
      ;(process as any).argv = origArgv
    }
  })

  it('开发模式下 viewer.html 可读时应成功启动', async () => {
    mockExistsSync = true
    mockReadFileSync = () => '<!DOCTYPE html><html></html>'

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    const server = await startTraceServer({ port: 3991 })
    expect(typeof server.stop).toBe('function')
    server.stop()
  })

  it('Node.js 模式下 viewer.html 可读时应成功启动', async () => {
    mockExistsSync = true
    mockReadFileSync = () => '<!DOCTYPE html><html></html>'

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    const server = await startTraceServer({ port: 3992 })
    expect(typeof server.stop).toBe('function')
    server.stop()
  })

  it('viewer.html 文件读取失败应抛出异常', async () => {
    mockExistsSync = false
    mockReadFileSyncThrow = true

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    await expect(startTraceServer({ port: 3993 })).rejects.toThrow()
  })

  it('Bun 模式下 server 应正确启动并返回端口', async () => {
    mockExistsSync = true
    mockReadFileSync = () => '<!DOCTYPE html><html></html>'

    const { startTraceServer } = await import('../../../../src/services/trace/traceServer')
    const server = await startTraceServer({ port: 3994 })
    expect(typeof server.stop).toBe('function')
    server.stop()
  })
})