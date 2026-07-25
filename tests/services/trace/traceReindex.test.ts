import { describe, it, expect, vi, beforeEach } from 'vitest'
import { traceReindex } from '../../../src/services/trace/traceReindex.js'

// vi.hoisted 确保变量在 vi.mock 之前被提升
const mockReaddir = vi.hoisted(() => vi.fn())
const mockReadFile = vi.hoisted(() => vi.fn())
const mockWriteFile = vi.hoisted(() => vi.fn())
const mockRename = vi.hoisted(() => vi.fn())
const mockFsMkdir = vi.hoisted(() => vi.fn())
const mockCopyFile = vi.hoisted(() => vi.fn())
const mockAccess = vi.hoisted(() => vi.fn())
const mockWriteIndex = vi.hoisted(() => vi.fn())

vi.mock('fs/promises', () => ({
  readdir: mockReaddir,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  rename: mockRename,
  mkdir: mockFsMkdir,
  copyFile: mockCopyFile,
  access: mockAccess,
}))

vi.mock('../../../src/services/trace/traceStore.js', () => ({
  getTracesDir: () => '/tmp/traces',
  getIndexPath: () => '/tmp/traces/index.json',
  readIndex: vi.fn(),
  writeIndex: mockWriteIndex,
}))

describe('traceReindex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteFile.mockResolvedValue(undefined)
    mockRename.mockResolvedValue(undefined)
    mockFsMkdir.mockResolvedValue(undefined)
    mockWriteIndex.mockResolvedValue(undefined)
  })

  it('should create empty index when no trace files', async () => {
    mockReaddir.mockResolvedValue([])
    mockAccess.mockRejectedValue(new Error('not found'))

    const output = await traceReindex('/tmp/traces-empty')
    expect(output).toContain('未找到 trace 文件')
  })

  it('should backup existing index before rebuilding', async () => {
    mockReaddir
      .mockResolvedValueOnce([{ name: '2026-01-01', isDirectory: () => true }] as any)
      .mockResolvedValueOnce(['session1.jsonl'] as any)
    mockReadFile.mockResolvedValue('{"data":"test"}\n')
    mockAccess.mockResolvedValue(undefined)
    mockCopyFile.mockResolvedValue(undefined)

    const output = await traceReindex('/tmp/traces-with-index')
    expect(output).toContain('重建索引完成')
    expect(mockCopyFile).toHaveBeenCalled()
  })

  it('should skip corrupt JSONL files with warning', async () => {
    mockReaddir
      .mockResolvedValueOnce([{ name: '2026-01-01', isDirectory: () => true }] as any)
      .mockResolvedValueOnce(['session1.jsonl', 'session2.jsonl'] as any)
    mockAccess.mockRejectedValue(new Error('not found'))
    mockReadFile
      .mockRejectedValueOnce(new Error('corrupt file'))
      .mockResolvedValueOnce('{"data":"valid"}\n')

    const output = await traceReindex('/tmp/traces-partial-corrupt')
    expect(output).toContain('跳过')
  })
})