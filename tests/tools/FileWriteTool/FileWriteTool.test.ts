import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 所有外部依赖
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn(),
}))

vi.mock('path', () => ({
  dirname: vi.fn(),
  sep: '/',
  join: vi.fn((...args: string[]) => args.join('/')),
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
  isENOENT: vi.fn(),
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS: class extends Error {},
}))

vi.mock('../../../src/utils/file.js', () => ({
  getFileModificationTime: vi.fn(),
  writeTextContent: vi.fn(),
  getDisplayPath: vi.fn((p: string) => p),
}))

vi.mock('../../../src/utils/fileRead.js', () => ({
  readFileSyncWithMetadata: vi.fn(),
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

vi.mock('../../../src/utils/permissions/filesystem.js', () => ({
  checkWritePermissionForTool: vi.fn(),
  matchingRuleForInput: vi.fn(),
}))

vi.mock('../../../src/utils/permissions/shellRuleMatching.js', () => ({
  matchWildcardPattern: vi.fn(),
  permissionRuleExtractPrefix: vi.fn(),
  parsePermissionRule: vi.fn(),
}))

vi.mock('../../../src/utils/fileOperationAnalytics.js', () => ({
  logFileOperation: vi.fn(),
}))

vi.mock('../../../src/services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))

vi.mock('../../../src/services/analytics/growthbook.js', () => ({
  getFeatureValue_CACHED_MAY_BE_STALE: vi.fn(),
}))

vi.mock('../../../src/utils/fsOperations.js', () => ({
  getFsImplementation: vi.fn(() => ({
    stat: vi.fn(),
    readFileBytes: vi.fn(),
    writeFile: vi.fn(),
  })),
  getPathsForPermissionCheck: vi.fn(),
}))

vi.mock('../../../src/utils/debug.js', () => ({
  logForDebugging: vi.fn(),
}))

vi.mock('../../../src/utils/diff.js', () => ({
  countLinesChanged: vi.fn(),
  getPatchForDisplay: vi.fn(),
}))

vi.mock('../../../src/utils/envUtils.js', () => ({
  isEnvTruthy: vi.fn(),
}))

vi.mock('../../../src/utils/fileHistory.js', () => ({
  fileHistoryEnabled: vi.fn(),
  fileHistoryTrackEdit: vi.fn(),
}))

vi.mock('../../../src/utils/gitDiff.js', () => ({
  fetchSingleFileGitDiff: vi.fn(),
}))

vi.mock('../../../src/utils/messages.js', () => ({
  createUserMessage: vi.fn(),
}))

vi.mock('../../../src/services/diagnosticTracking.js', () => ({
  diagnosticTracker: vi.fn(),
}))

vi.mock('../../../src/services/lsp/LSPDiagnosticRegistry.js', () => ({
  clearDeliveredDiagnosticsForFile: vi.fn(),
}))

vi.mock('../../../src/services/lsp/manager.js', () => ({
  getLspServerManager: vi.fn(),
}))

vi.mock('../../../src/services/mcp/vscodeSdkMcp.js', () => ({
  notifyVscodeFileUpdated: vi.fn(),
}))

vi.mock('../../../src/services/teamMemorySync/teamMemSecretGuard.js', () => ({
  checkTeamMemSecrets: vi.fn(),
}))

vi.mock('../../../src/skills/loadSkillsDir.js', () => ({
  activateConditionalSkillsForPaths: vi.fn(),
  addSkillDirectories: vi.fn(),
  discoverSkillDirsForPaths: vi.fn(() => []),
}))

vi.mock('../../../src/tools/FileEditTool/constants.js', () => ({
  FILE_UNEXPECTEDLY_MODIFIED_ERROR: 'File unexpectedly modified',
  FILE_EDIT_TOOL_NAME: 'Edit',
}))

vi.mock('../../../src/tools/FileEditTool/types.js', () => ({
  gitDiffSchema: vi.fn(() => ({
    optional: vi.fn().mockReturnThis(),
  })),
  hunkSchema: vi.fn(() => ({})),
}))

vi.mock('./prompt.js', () => ({
  FILE_WRITE_TOOL_NAME: 'Write',
  getWriteToolDescription: vi.fn(() => 'Write a file'),
}))

vi.mock('./UI.js', () => ({
  getToolUseSummary: vi.fn(),
  isResultTruncated: vi.fn(),
  renderToolResultMessage: vi.fn(),
  renderToolUseErrorMessage: vi.fn(),
  renderToolUseMessage: vi.fn(),
  renderToolUseRejectedMessage: vi.fn(),
  userFacingName: vi.fn(() => 'Write'),
}))

// Mock zod 和其他可能导致循环依赖的模块
vi.mock('zod/v4', () => {
  const createChainable = () => ({
    describe: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    nonnegative: vi.fn().mockReturnThis(),
    positive: vi.fn().mockReturnThis(),
    int: vi.fn().mockReturnThis(),
    boolean: vi.fn().mockReturnThis(),
    default: vi.fn().mockReturnThis(),
    nullable: vi.fn().mockReturnThis(),
    min: vi.fn().mockReturnThis(),
    max: vi.fn().mockReturnThis(),
    url: vi.fn().mockReturnThis(),
    startsWith: vi.fn().mockReturnThis(),
    trim: vi.fn().mockReturnThis(),
    transform: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    superRefine: vi.fn().mockReturnThis(),
  })

  const createObjectChainable = () => ({
    ...createChainable(),
    passthrough: vi.fn().mockReturnThis(),
    extend: vi.fn().mockReturnThis(),
    merge: vi.fn().mockReturnThis(),
    omit: vi.fn().mockReturnThis(),
    pick: vi.fn().mockReturnThis(),
    refine: vi.fn().mockReturnThis(),
    shape: {
      file_path: createChainable(),
      content: createChainable(),
    },
  })

  const z = {
    strictObject: vi.fn(() => createObjectChainable()),
    string: vi.fn(() => createChainable()),
    number: vi.fn(() => createChainable()),
    boolean: vi.fn(() => createChainable()),
    enum: vi.fn(() => createChainable()),
    object: vi.fn(() => createObjectChainable()),
    literal: vi.fn(() => createChainable()),
    discriminatedUnion: vi.fn(() => createChainable()),
    array: vi.fn(() => createChainable()),
    any: vi.fn(() => createChainable()),
    unknown: vi.fn(() => createChainable()),
    lazy: vi.fn(() => createChainable()),
    preprocess: vi.fn((preprocess, schema) => schema),
    record: vi.fn(() => createChainable()),
    union: vi.fn(() => createChainable()),
    coerce: {
      number: vi.fn(() => createChainable()),
      string: vi.fn(() => createChainable()),
    },
  }

  return {
    z,
    default: z,
  }
})

// Mock 可能导致循环依赖的模块
vi.mock('../../../src/utils/plugins/schemas.js', () => ({
  DependencyRefSchema: vi.fn(),
}))

vi.mock('../../../src/utils/settings/types.js', () => ({
  HooksSchema: vi.fn(() => ({
    optional: vi.fn().mockReturnThis(),
  })),
  SettingsSchema: vi.fn(() => ({
    pick: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    strip: vi.fn().mockReturnThis(),
  })),
}))

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
  firstPartyNameToCanonical: vi.fn((name: string) => name),
}))

vi.mock('../../../src/entrypoints/sdk/coreSchemas.js', () => ({
  SDKAssistantMessageErrorSchema: vi.fn(() => ({})),
  PreToolUseHookInputSchema: vi.fn(() => ({})),
  PostToolUseHookInputSchema: vi.fn(() => ({})),
  StopHookInputSchema: vi.fn(() => ({})),
  NotificationHookInputSchema: vi.fn(() => ({})),
  PermissionModeSchema: vi.fn(() => ({
    optional: vi.fn().mockReturnThis(),
  })),
  PermissionUpdateDestinationSchema: vi.fn(() => ({})),
  BaseHookInputSchema: vi.fn(() => ({
    and: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('../../../src/components/messages/RateLimitMessage.tsx', () => ({
  default: vi.fn(),
}))

vi.mock('../../../src/commands.ts', () => ({
  getCommands: vi.fn(() => []),
}))

// Import after mocks
const { FileWriteTool } = await import('../../../src/tools/FileWriteTool/FileWriteTool.js')

describe('FileWriteTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(FileWriteTool.name).toBe('Write')
    })

    it('应该返回正确的用户可见名称', () => {
      expect(FileWriteTool.userFacingName()).toBe('Write')
    })

    it('应该返回正确的活动描述', () => {
      const result = FileWriteTool.getActivityDescription({
        file_path: '/test/file.txt',
        content: 'content',
      })
      expect(result).toContain('Writing')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(FileWriteTool.inputSchema).toBeDefined()
    })

    it('应该要求 file_path 字段', () => {
      const schema = FileWriteTool.inputSchema
      expect(schema.shape.file_path).toBeDefined()
    })

    it('应该要求 content 字段', () => {
      const schema = FileWriteTool.inputSchema
      expect(schema.shape.content).toBeDefined()
    })
  })

  describe('validateInput', () => {
    const mockContext = {
      getAppState: vi.fn(() => ({
        toolPermissionContext: {},
      })),
      readFileState: new Map(),
    }

    beforeEach(async () => {
      const { matchingRuleForInput } = await import('../../../src/utils/permissions/filesystem.js')
      vi.mocked(matchingRuleForInput).mockReturnValue(null)

      const { checkTeamMemSecrets } = await import('../../../src/services/teamMemorySync/teamMemSecretGuard.js')
      vi.mocked(checkTeamMemSecrets).mockResolvedValue(null)
    })

    it('应该允许写入新文件', async () => {
      const { getFsImplementation } = await import('../../../src/utils/fsOperations.js')
      const mockFs = {
        stat: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
        readFileBytes: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
        writeFile: vi.fn(),
      }
      vi.mocked(getFsImplementation).mockReturnValue(mockFs as any)

      const { isENOENT } = await import('../../../src/utils/errors.js')
      vi.mocked(isENOENT).mockReturnValue(true)

      const result = await FileWriteTool.validateInput(
        { file_path: '/test/new-file.txt', content: 'content' },
        mockContext as any,
      )

      expect(result.result).toBe(true)
    })

    it('应该允许覆盖已有文件', async () => {
      const { getFsImplementation } = await import('../../../src/utils/fsOperations.js')
      const mockFs = {
        stat: vi.fn().mockResolvedValue({ size: 100 }),
        readFileBytes: vi.fn().mockResolvedValue(Buffer.from('old content')),
        writeFile: vi.fn(),
      }
      vi.mocked(getFsImplementation).mockReturnValue(mockFs as any)

      mockContext.readFileState.set('/test/file.txt', {
        content: 'old content',
        timestamp: Date.now(),
      })

      const result = await FileWriteTool.validateInput(
        { file_path: '/test/file.txt', content: 'new content' },
        mockContext as any,
      )

      expect(result.result).toBe(true)
    })
  })

  describe('getPath', () => {
    it('应该返回 file_path', () => {
      const result = FileWriteTool.getPath({ file_path: '/test/file.txt', content: 'content' })
      expect(result).toBe('/test/file.txt')
    })
  })

  describe('toAutoClassifierInput', () => {
    it('应该返回 file_path 和 content', () => {
      const result = FileWriteTool.toAutoClassifierInput({
        file_path: '/test/file.txt',
        content: 'content',
      })
      expect(result).toBe('/test/file.txt: content')
    })
  })
})
