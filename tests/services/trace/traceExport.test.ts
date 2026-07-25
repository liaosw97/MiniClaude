import { describe, it, expect, vi, beforeEach } from 'vitest'
import { traceExport, formatAsJsonl, formatAsLog } from '../../../src/services/trace/traceExport.js'

// vi.hoisted 确保变量在 vi.mock 之前被提升
const mockGetSessionTrace = vi.hoisted(() => vi.fn())

vi.mock('../../../src/services/trace/traceStore.js', () => ({
  getSessionTrace: mockGetSessionTrace,
}))

describe('formatAsJsonl', () => {
  it('should output records as JSONL', () => {
    const records = [
      { turn: 1, request: { body: 'test' } },
      { turn: 2, request: { body: 'test2' } },
    ]
    const output = formatAsJsonl(records)
    const lines = output.trim().split('\n')
    expect(lines.length).toBe(2)
    expect(() => JSON.parse(lines[0])).not.toThrow()
  })
})

describe('formatAsLog', () => {
  it('should output human-readable log format', () => {
    const records = [
      { timestamp: 1000, turn: 1, request: { body: { messages: [{ role: 'user', content: 'hello' }] } } },
    ]
    const output = formatAsLog(records)
    expect(output).toContain('[user]')
    expect(output).toContain('hello')
  })
})

describe('traceExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return error for non-existent session', async () => {
    mockGetSessionTrace.mockResolvedValue([])
    const result = await traceExport('non-existent', undefined, 'jsonl', '/tmp/traces-empty')
    expect(result).toContain('未找到指定会话')
  })
})