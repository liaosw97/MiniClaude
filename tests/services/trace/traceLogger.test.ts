import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fs 模块 — 必须在所有 import 之前
const mockAppendFileSync = vi.fn()
const mockMkdirSync = vi.fn()

vi.mock('fs', () => ({
  appendFileSync: mockAppendFileSync,
  mkdirSync: mockMkdirSync,
}))

// Mock logForDebugging
vi.mock('../../../src/utils/debug.js', () => ({
  logForDebugging: vi.fn(),
}))

describe('traceLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
  })

  it('应输出所有级别的日志到文件', async () => {
    const { traceLogger } = await import('../../../src/services/trace/traceLogger')
    traceLogger.debug('debug msg')
    traceLogger.info('info msg')
    traceLogger.warn('warn msg')
    traceLogger.error('error msg')
    // warn 和 error 写入文件，debug 和 info 不写入
    expect(mockAppendFileSync).toHaveBeenCalledTimes(2) // warn + error
  })

  it('info 级别不应写入文件，warn 级别应写入文件', async () => {
    const { traceLogger } = await import('../../../src/services/trace/traceLogger')
    traceLogger.info('info msg')
    expect(mockAppendFileSync).not.toHaveBeenCalled()

    traceLogger.warn('warn msg')
    expect(mockAppendFileSync).toHaveBeenCalledTimes(1)
  })

  it('warn 日志写入文件应包含正确格式', async () => {
    const { traceLogger } = await import('../../../src/services/trace/traceLogger')
    traceLogger.warn('test message')
    expect(mockAppendFileSync).toHaveBeenCalledTimes(1)
    const callArg = mockAppendFileSync.mock.calls[0][1]
    expect(callArg).toContain('[WARN]')
    expect(callArg).toContain('[trace]')
    expect(callArg).toContain('test message')
    expect(callArg).toContain('\n')
  })

  it('error 日志应包含错误详情', async () => {
    const { traceLogger } = await import('../../../src/services/trace/traceLogger')
    const testError = new Error('test error')
    traceLogger.error('error occurred', testError)
    expect(mockAppendFileSync).toHaveBeenCalled()
    const calls = mockAppendFileSync.mock.calls
    const content = calls.map((c: any[]) => c[1]).join('')
    expect(content).toContain('[ERROR]')
    expect(content).toContain('test error')
  })

  it('warn 日志应确保目录被创建', async () => {
    const { traceLogger } = await import('../../../src/services/trace/traceLogger')
    traceLogger.warn('test')
    expect(mockMkdirSync).toHaveBeenCalled()
    expect(mockMkdirSync.mock.calls[0][0]).toContain('traces')
  })
})