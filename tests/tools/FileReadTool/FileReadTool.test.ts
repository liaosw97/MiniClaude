import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 所有外部依赖
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}))

vi.mock('../../../src/Tool.js', () => ({
  buildTool: vi.fn((config: any) => config),
}))

vi.mock('../../../src/utils/cwd.js', () => ({
  getCwd: vi.fn(() => '/test/cwd'),
}))

vi.mock('../../../src/utils/path.js', () => ({
  expandPath: vi.fn((p: string) => p),
}))

vi.mock('../../../src/utils/errors.js', () => ({
  getErrnoCode: vi.fn(),
  isENOENT: vi.fn(),
}))

vi.mock('../../../src/utils/file.js', () => ({
  addLineNumbers: vi.fn(({ content, startLine }) => {
    return content.split('\n').map((line: string, i: number) => `${startLine + i}\t${line}`).join('\n')
  }),
  FILE_NOT_FOUND_CWD_NOTE: 'File not found',
  findSimilarFile: vi.fn(),
  getFileModificationTimeAsync: vi.fn(),
  suggestPathUnderCwd: vi.fn(),
  MAX_OUTPUT_SIZE: 256 * 1024,
}))

vi.mock('../../../src/utils/format.js', () => ({
  formatFileSize: vi.fn((size: number) => `${size} bytes`),
}))

vi.mock('../../../src/utils/lazySchema.js', () => ({
  lazySchema: vi.fn((fn: () => any) => {
    const result = fn()
    return () => result
  }),
}))

vi.mock('../../../src/utils/log.js', () => ({
  logError: vi.fn(),
}))

vi.mock('../../../src/utils/messages.js', () => ({
  createUserMessage: vi.fn(),
}))

vi.mock('../../../src/utils/permissions/filesystem.js', () => ({
  checkReadPermissionForTool: vi.fn(),
  matchingRuleForInput: vi.fn(),
}))

vi.mock('../../../src/utils/permissions/shellRuleMatching.js', () => ({
  matchWildcardPattern: vi.fn(),
}))

vi.mock('../../../src/utils/fileOperationAnalytics.js', () => ({
  logFileOperation: vi.fn(),
}))

vi.mock('../../../src/services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))

vi.mock('../../../src/services/analytics/metadata.js', () => ({
  getFileExtensionForAnalytics: vi.fn(),
}))

vi.mock('../../../src/services/tokenEstimation.js', () => ({
  countTokensWithAPI: vi.fn(),
  roughTokenCountEstimationForFileType: vi.fn(),
}))

vi.mock('../../../src/utils/readFileInRange.js', () => ({
  readFileInRange: vi.fn(),
}))

vi.mock('../../../src/utils/imageResizer.js', () => ({
  compressImageBufferWithTokenLimit: vi.fn(),
  createImageMetadataText: vi.fn(),
  detectImageFormatFromBuffer: vi.fn(),
  maybeResizeAndDownsampleImageBuffer: vi.fn(),
  ImageResizeError: class ImageResizeError extends Error {},
}))

vi.mock('../../../src/utils/notebook.js', () => ({
  mapNotebookCellsToToolResult: vi.fn(),
  readNotebook: vi.fn(),
}))

vi.mock('../../../src/utils/pdf.js', () => ({
  extractPDFPages: vi.fn(),
  getPDFPageCount: vi.fn(),
  readPDF: vi.fn(),
}))

vi.mock('../../../src/utils/pdfUtils.js', () => ({
  isPDFExtension: vi.fn(),
  isPDFSupported: vi.fn(),
  parsePDFPageRange: vi.fn(),
}))

vi.mock('../../../src/utils/memoryFileDetection.js', () => ({
  isAutoMemFile: vi.fn(() => false),
}))

vi.mock('../../../src/memdir/memoryAge.js', () => ({
  memoryFreshnessNote: vi.fn(),
}))

vi.mock('../../../src/skills/loadSkillsDir.js', () => ({
  activateConditionalSkillsForPaths: vi.fn(),
  addSkillDirectories: vi.fn(),
  discoverSkillDirsForPaths: vi.fn(() => []),
}))

vi.mock('../../../src/utils/envUtils.js', () => ({
  getClaudeConfigHomeDir: vi.fn(),
  isEnvTruthy: vi.fn(),
}))

vi.mock('../../../src/services/analytics/growthbook.js', () => ({
  getFeatureValue_CACHED_MAY_BE_STALE: vi.fn(),
}))

vi.mock('../../../src/constants/apiLimits.js', () => ({
  PDF_AT_MENTION_INLINE_THRESHOLD: 10,
  PDF_EXTRACT_SIZE_THRESHOLD: 1024 * 1024,
  PDF_MAX_PAGES_PER_READ: 20,
}))

vi.mock('../../../src/constants/files.js', () => ({
  hasBinaryExtension: vi.fn(() => false),
}))

vi.mock('../../../src/utils/fsOperations.js', () => ({
  getFsImplementation: vi.fn(() => ({
    stat: vi.fn(),
    readFileBytes: vi.fn(),
  })),
}))

vi.mock('../../../src/utils/semanticNumber.js', () => ({
  semanticNumber: vi.fn((schema) => schema),
}))

vi.mock('../../../src/utils/slowOperations.js', () => ({
  jsonStringify: vi.fn((obj) => JSON.stringify(obj)),
}))

vi.mock('../../../src/tools/BashTool/toolName.js', () => ({
  BASH_TOOL_NAME: 'Bash',
}))

vi.mock('./limits.js', () => ({
  getDefaultFileReadingLimits: vi.fn(() => ({
    maxSizeBytes: 256 * 1024,
    maxTokens: 25000,
    includeMaxSizeInPrompt: false,
    targetedRangeNudge: false,
  })),
}))

vi.mock('./prompt.js', () => ({
  DESCRIPTION: 'Read a file',
  FILE_READ_TOOL_NAME: 'Read',
  FILE_UNCHANGED_STUB: 'File unchanged',
  LINE_FORMAT_INSTRUCTION: 'Line format',
  OFFSET_INSTRUCTION_DEFAULT: 'Offset default',
  OFFSET_INSTRUCTION_TARGETED: 'Offset targeted',
  renderPromptTemplate: vi.fn(() => 'prompt'),
}))

vi.mock('./UI.js', () => ({
  getToolUseSummary: vi.fn(),
  renderToolResultMessage: vi.fn(),
  renderToolUseErrorMessage: vi.fn(),
  renderToolUseMessage: vi.fn(),
  renderToolUseTag: vi.fn(),
  userFacingName: vi.fn(() => 'Read'),
}))

// Mock zod 和其他可能导致循环依赖的模块
vi.mock('zod/v4', () => {
  const createChainable = () => ({
    describe: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    nonnegative: vi.fn().mockReturnThis(),
    positive: vi.fn().mockReturnThis(),
    int: vi.fn().mockReturnThis(),
  })

  return {
    z: {
      strictObject: vi.fn(() => ({
        shape: {
          file_path: createChainable(),
          offset: createChainable(),
          limit: createChainable(),
          pages: createChainable(),
        },
      })),
      string: vi.fn(() => createChainable()),
      number: vi.fn(() => createChainable()),
      enum: vi.fn(() => createChainable()),
      object: vi.fn(() => createChainable()),
      literal: vi.fn(() => createChainable()),
      discriminatedUnion: vi.fn(() => createChainable()),
      array: vi.fn(() => createChainable()),
      any: vi.fn(() => createChainable()),
    },
  }
})

// Mock 可能导致循环依赖的模块
vi.mock('../../../src/utils/plugins/schemas.js', () => ({
  DependencyRefSchema: vi.fn(),
}))

vi.mock('../../../src/utils/settings/types.js', () => ({}))

vi.mock('../../../src/utils/settings/permissionValidation.js', () => ({
  PermissionRuleSchema: vi.fn(),
  validatePermissionRule: vi.fn(),
}))

vi.mock('../../../src/utils/settings/validation.js', () => ({}))

vi.mock('../../../src/utils/model/modelCapabilities.js', () => ({}))

vi.mock('../../../src/utils/context.js', () => ({}))

vi.mock('../../../src/utils/settings/settings.js', () => ({
  getSettingsRootPathForSource: vi.fn(() => '/test/settings'),
  getSettingsFilePathForSource: vi.fn(() => '/test/settings.json'),
  loadSettingsFromDisk: vi.fn(),
  getSettingsWithErrors: vi.fn(),
  getInitialSettings: vi.fn(),
}))

vi.mock('../../../src/utils/model/model.js', () => ({
  getCanonicalName: vi.fn(() => 'claude-sonnet-4-20250514'),
  getMainLoopModel: vi.fn(() => 'claude-sonnet-4-20250514'),
  getUserSpecifiedModelSetting: vi.fn(),
}))

// Import after mocks
const { FileReadTool } = await import('../../../src/tools/FileReadTool/FileReadTool.js')

describe('FileReadTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(FileReadTool.name).toBe('Read')
    })

    it('应该是只读工具', () => {
      expect(FileReadTool.isReadOnly()).toBe(true)
    })

    it('应该支持并发', () => {
      expect(FileReadTool.isConcurrencySafe()).toBe(true)
    })

    it('应该返回正确的用户可见名称', () => {
      expect(FileReadTool.userFacingName()).toBe('Read')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(FileReadTool.inputSchema).toBeDefined()
    })

    it('应该要求 file_path 字段', () => {
      const schema = FileReadTool.inputSchema
      expect(schema.shape.file_path).toBeDefined()
    })

    it('offset 应该是可选的', () => {
      const schema = FileReadTool.inputSchema
      expect(schema.shape.offset).toBeDefined()
    })

    it('limit 应该是可选的', () => {
      const schema = FileReadTool.inputSchema
      expect(schema.shape.limit).toBeDefined()
    })

    it('pages 应该是可选的', () => {
      const schema = FileReadTool.inputSchema
      expect(schema.shape.pages).toBeDefined()
    })
  })

  describe('validateInput', () => {
    const mockContext = {
      getAppState: vi.fn(() => ({
        toolPermissionContext: {},
      })),
    }

    beforeEach(async () => {
      const { matchingRuleForInput } = await import('../../../src/utils/permissions/filesystem.js')
      vi.mocked(matchingRuleForInput).mockReturnValue(null)
    })

    it('应该拒绝二进制文件', async () => {
      const { hasBinaryExtension } = await import('../../../src/constants/files.js')
      vi.mocked(hasBinaryExtension).mockReturnValue(true)

      const result = await FileReadTool.validateInput(
        { file_path: '/test/file.bin' },
        mockContext as any,
      )

      expect(result.result).toBe(false)
      expect(result.message).toContain('binary')
    })

    it('应该允许文本文件', async () => {
      const { hasBinaryExtension } = await import('../../../src/constants/files.js')
      vi.mocked(hasBinaryExtension).mockReturnValue(false)

      const result = await FileReadTool.validateInput(
        { file_path: '/test/file.txt' },
        mockContext as any,
      )

      expect(result.result).toBe(true)
    })

    it('应该拒绝被阻止的设备路径', async () => {
      const result = await FileReadTool.validateInput(
        { file_path: '/dev/zero' },
        mockContext as any,
      )

      expect(result.result).toBe(false)
      expect(result.message).toContain('device file')
    })

    it('应该允许 /dev/null', async () => {
      const result = await FileReadTool.validateInput(
        { file_path: '/dev/null' },
        mockContext as any,
      )

      expect(result.result).toBe(true)
    })
  })

  describe('call', () => {
    const mockContext = {
      readFileState: new Map(),
      fileReadingLimits: undefined,
      abortController: {
        signal: new AbortController().signal,
      },
      nestedMemoryAttachmentTriggers: new Set(),
      dynamicSkillDirTriggers: new Set(),
    }

    it('应该读取文本文件成功', async () => {
      const { readFileInRange } = await import('../../../src/utils/readFileInRange.js')
      vi.mocked(readFileInRange).mockResolvedValue({
        content: 'line1\nline2\nline3',
        lineCount: 3,
        totalLines: 3,
        totalBytes: 17,
        readBytes: 17,
        mtimeMs: Date.now(),
      })

      const result = await FileReadTool.call(
        { file_path: '/test/file.txt', offset: 1, limit: undefined },
        mockContext as any,
      )

      expect(result.data.type).toBe('text')
      if (result.data.type === 'text') {
        expect(result.data.file.content).toBe('line1\nline2\nline3')
        expect(result.data.file.numLines).toBe(3)
        expect(result.data.file.totalLines).toBe(3)
      }
    })

    it('应该处理文件不存在的情况', async () => {
      const { readFileInRange } = await import('../../../src/utils/readFileInRange.js')
      const error = new Error('File not found')
      ;(error as any).code = 'ENOENT'
      vi.mocked(readFileInRange).mockRejectedValue(error)

      const { getErrnoCode } = await import('../../../src/utils/errors.js')
      vi.mocked(getErrnoCode).mockReturnValue('ENOENT')

      await expect(
        FileReadTool.call(
          { file_path: '/test/nonexistent.txt', offset: 1, limit: undefined },
          mockContext as any,
        ),
      ).rejects.toThrow('File not found')
    })

    it('应该读取带偏移量的文件', async () => {
      const { readFileInRange } = await import('../../../src/utils/readFileInRange.js')
      vi.mocked(readFileInRange).mockResolvedValue({
        content: 'line2\nline3',
        lineCount: 2,
        totalLines: 3,
        totalBytes: 17,
        readBytes: 11,
        mtimeMs: Date.now(),
      })

      const result = await FileReadTool.call(
        { file_path: '/test/file.txt', offset: 2, limit: 2 },
        mockContext as any,
      )

      expect(result.data.type).toBe('text')
      if (result.data.type === 'text') {
        expect(result.data.file.startLine).toBe(2)
        expect(result.data.file.numLines).toBe(2)
      }
    })

    it('应该返回 file_unchanged 当文件未修改时', async () => {
      const mtimeMs = 1234567890
      mockContext.readFileState.set('/test/file.txt', {
        content: 'line1\nline2\nline3',
        timestamp: mtimeMs,
        offset: 1,
        limit: undefined,
      })

      const { getFileModificationTimeAsync } = await import('../../../src/utils/file.js')
      vi.mocked(getFileModificationTimeAsync).mockResolvedValue(mtimeMs)

      const { getFeatureValue_CACHED_MAY_BE_STALE } = await import('../../../src/services/analytics/growthbook.js')
      vi.mocked(getFeatureValue_CACHED_MAY_BE_STALE).mockReturnValue(false)

      const result = await FileReadTool.call(
        { file_path: '/test/file.txt', offset: 1, limit: undefined },
        mockContext as any,
      )

      expect(result.data.type).toBe('file_unchanged')
    })
  })

  describe('mapToolResultToToolResultBlockParam', () => {
    it('应该处理 text 类型结果', () => {
      const data = {
        type: 'text' as const,
        file: {
          filePath: '/test/file.txt',
          content: 'line1\nline2',
          numLines: 2,
          startLine: 1,
          totalLines: 2,
        },
      }

      const result = FileReadTool.mapToolResultToToolResultBlockParam(data, 'test-id')

      expect(result.tool_use_id).toBe('test-id')
      expect(result.type).toBe('tool_result')
      expect(result.content).toContain('line1')
    })

    it('应该处理 file_unchanged 类型结果', () => {
      const data = {
        type: 'file_unchanged' as const,
        file: {
          filePath: '/test/file.txt',
        },
      }

      const result = FileReadTool.mapToolResultToToolResultBlockParam(data, 'test-id')

      expect(result.tool_use_id).toBe('test-id')
      expect(result.content).toContain('File unchanged')
    })
  })

  describe('getPath', () => {
    it('应该返回 file_path', () => {
      const result = FileReadTool.getPath({ file_path: '/test/file.txt' })
      expect(result).toBe('/test/file.txt')
    })

    it('应该返回 cwd 当 file_path 为空时', async () => {
      const { getCwd } = await import('../../../src/utils/cwd.js')
      vi.mocked(getCwd).mockReturnValue('/test/cwd')

      const result = FileReadTool.getPath({ file_path: '' })
      expect(result).toBe('/test/cwd')
    })
  })
})
