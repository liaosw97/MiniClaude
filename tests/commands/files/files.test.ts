import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../../src/utils/cwd.js', () => ({
  getCwd: vi.fn(() => '/mock/cwd'),
}))

vi.mock('../../../src/utils/fileStateCache.js', () => ({
  cacheKeys: vi.fn(() => []),
}))

// Import after mocks
const { call } = await import('../../../src/commands/files/files.js')

describe('files 命令', () => {
  const mockContext = {
    readFileState: new Map(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本功能', () => {
    it('当没有文件时应该返回提示', async () => {
      const { cacheKeys } = await import('../../../src/utils/fileStateCache.js')
      vi.mocked(cacheKeys).mockReturnValue([])

      const result = await call('', mockContext as any)

      expect(result).toEqual({
        type: 'text',
        value: 'No files in context',
      })
    })

    it('当有文件时应该返回文件列表', async () => {
      const { cacheKeys } = await import('../../../src/utils/fileStateCache.js')
      vi.mocked(cacheKeys).mockReturnValue([
        '/mock/cwd/src/file1.ts',
        '/mock/cwd/src/file2.ts',
      ])

      const result = await call('', mockContext as any)

      expect(result.type).toBe('text')
      expect(result.value).toContain('Files in context:')
      expect(result.value).toMatch(/src[/\\]file1\.ts/)
      expect(result.value).toMatch(/src[/\\]file2\.ts/)
    })

    it('应该使用相对路径', async () => {
      const { cacheKeys } = await import('../../../src/utils/fileStateCache.js')
      vi.mocked(cacheKeys).mockReturnValue([
        '/mock/cwd/src/deep/nested/file.ts',
      ])

      const result = await call('', mockContext as any)

      // 在 Windows 上路径分隔符可能是反斜杠
      expect(result.value).toMatch(/src[/\\]deep[/\\]nested[/\\]file\.ts/)
      expect(result.value).not.toContain('/mock/cwd')
    })

    it('当 readFileState 为空时应该返回提示', async () => {
      const contextWithoutState = {}

      const result = await call('', contextWithoutState as any)

      expect(result).toEqual({
        type: 'text',
        value: 'No files in context',
      })
    })

    it('当 readFileState 为 undefined 时应该返回提示', async () => {
      const contextWithUndefined = {
        readFileState: undefined,
      }

      const result = await call('', contextWithUndefined as any)

      expect(result).toEqual({
        type: 'text',
        value: 'No files in context',
      })
    })
  })

  describe('返回值格式', () => {
    it('应该返回正确的类型', async () => {
      const result = await call('', mockContext as any)

      expect(result.type).toBe('text')
    })

    it('单个文件应该正确显示', async () => {
      const { cacheKeys } = await import('../../../src/utils/fileStateCache.js')
      vi.mocked(cacheKeys).mockReturnValue(['/mock/cwd/src/index.ts'])

      const result = await call('', mockContext as any)

      expect(result.value).toMatch(/Files in context:\nsrc[/\\]index\.ts/)
    })

    it('多个文件应该用换行符分隔', async () => {
      const { cacheKeys } = await import('../../../src/utils/fileStateCache.js')
      vi.mocked(cacheKeys).mockReturnValue([
        '/mock/cwd/src/file1.ts',
        '/mock/cwd/src/file2.ts',
        '/mock/cwd/src/file3.ts',
      ])

      const result = await call('', mockContext as any)

      const lines = result.value.split('\n')
      expect(lines[0]).toBe('Files in context:')
      expect(lines[1]).toMatch(/src[/\\]file1\.ts/)
      expect(lines[2]).toMatch(/src[/\\]file2\.ts/)
      expect(lines[3]).toMatch(/src[/\\]file3\.ts/)
    })
  })

  describe('参数处理', () => {
    it('应该忽略参数', async () => {
      const { cacheKeys } = await import('../../../src/utils/fileStateCache.js')
      vi.mocked(cacheKeys).mockReturnValue(['/mock/cwd/src/file.ts'])

      const result = await call('some-args', mockContext as any)

      expect(result.value).toContain('Files in context:')
    })
  })
})
