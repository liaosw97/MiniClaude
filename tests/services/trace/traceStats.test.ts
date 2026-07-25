import { describe, it, expect, vi, beforeEach } from 'vitest'
import { traceStats, collectGlobalStats, collectSessionStats } from '../../../src/services/trace/traceStats.js'

// vi.hoisted 确保变量在 vi.mock 之前被提升
const mockReadIndex = vi.hoisted(() => vi.fn())
const mockGetSessionTrace = vi.hoisted(() => vi.fn())
const mockFsReaddir = vi.hoisted(() => vi.fn())
const mockFsReadFile = vi.hoisted(() => vi.fn())

vi.mock('../../../src/services/trace/traceStore.js', () => {
  return {
    readIndex: mockReadIndex,
    getSessionTrace: mockGetSessionTrace,
    listSessions: vi.fn(),
    getTracesDir: () => '/tmp/traces',
  }
})

vi.mock('fs/promises', () => {
  return {
    readdir: mockFsReaddir,
    readFile: mockFsReadFile,
  }
})

describe('collectGlobalStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return zeros for empty sessions', async () => {
    mockReadIndex.mockResolvedValue({ sessions: [] })

    const result = await collectGlobalStats('/tmp/traces-empty')
    expect(result).toEqual({
      totalSessions: 0,
      totalRequests: 0,
      totalTokens: 0,
      cacheHitRate: 0,
      avgResponseTime: 0,
    })
  })

  it('should calculate stats from session metadata', async () => {
    mockReadIndex.mockResolvedValue({
      sessions: [
        { turns: 5, totalInputTokens: 100, totalOutputTokens: 200, errors: 1 },
        { turns: 3, totalInputTokens: 50, totalOutputTokens: 100, errors: 0 },
      ] as any,
    })

    const result = await collectGlobalStats('/tmp/traces')
    expect(result.totalSessions).toBe(2)
    expect(result.totalTokens).toBe(450)
  })
})

describe('traceStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should output "暂无 trace 数据" for empty traces dir', async () => {
    mockReadIndex.mockResolvedValue({ sessions: [] })

    const output = await traceStats(undefined, '/tmp/traces-empty')
    expect(output).toContain('暂无 trace 数据')
  })

  it('should handle index.json corruption with fallback message', async () => {
    mockReadIndex.mockRejectedValue(new Error('corrupt'))
    mockFsReaddir.mockRejectedValue(new Error('no traces dir'))

    const output = await traceStats(undefined, '/tmp/traces-corrupt')
    expect(output).toBeTruthy()
    expect(output).toContain('警告')
  })
})

describe('collectSessionStats', () => {
  it('should calculate per-session token distribution', async () => {
    const records = [
      { normalized_usage: { input_tokens: 10, output_tokens: 20 } },
      { normalized_usage: { input_tokens: 30, output_tokens: 40 } },
    ]
    const result = await collectSessionStats('test', records)
    expect(result.totalTokens).toBe(100)
    expect(result.requestCount).toBe(2)
  })

  it('should handle records with no normalized_usage', async () => {
    const records = [
      { response: { body: { usage: { input_tokens: 5, output_tokens: 5 } } } },
      { response: { body: {} } },
    ]
    const result = await collectSessionStats('test', records)
    expect(result.totalTokens).toBe(10)
    expect(result.requestCount).toBe(2)
  })
})