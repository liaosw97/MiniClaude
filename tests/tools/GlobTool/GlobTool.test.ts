import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 所有外部依赖
vi.mock('../../../src/Tool.js', () => ({
  buildTool: vi.fn((config: any) => config),
}))

vi.mock('../../../src/utils/cwd.js', () => ({
  getCwd: vi.fn(() => '/test/cwd'),
}))

vi.mock('../../../src/utils/path.js', () => ({
  expandPath: vi.fn((p: string) => p),
  toRelativePath: vi.fn((p: string) => p),
}))

vi.mock('../../../src/utils/errors.js', () => ({
  isENOENT: vi.fn(),
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS: class extends Error {},
  ClaudeError: class extends Error {},
}))

vi.mock('../../../src/commands.ts', () => ({
  getCommands: vi.fn(() => []),
}))

vi.mock('../../../src/components/messages/RateLimitMessage.tsx', () => ({
  default: vi.fn(),
}))

vi.mock('../../../src/utils/file.js', () => ({
  FILE_NOT_FOUND_CWD_NOTE: 'File not found',
  suggestPathUnderCwd: vi.fn(),
}))

vi.mock('../../../src/utils/fsOperations.js', () => ({
  getFsImplementation: vi.fn(() => ({
    stat: vi.fn(),
  })),
  getPathsForPermissionCheck: vi.fn(),
}))

vi.mock('../../../src/utils/glob.js', () => ({
  glob: vi.fn(),
}))

vi.mock('../../../src/utils/lazySchema.js', () => ({
  lazySchema: vi.fn((fn: () => any) => {
    const result = fn()
    return () => result
  }),
}))

vi.mock('../../../src/utils/permissions/filesystem.js', () => ({
  checkReadPermissionForTool: vi.fn(),
}))

vi.mock('../../../src/utils/permissions/shellRuleMatching.js', () => ({
  matchWildcardPattern: vi.fn(),
  permissionRuleExtractPrefix: vi.fn(),
  parsePermissionRule: vi.fn(),
}))

vi.mock('./prompt.js', () => ({
  DESCRIPTION: 'Find files',
  GLOB_TOOL_NAME: 'Glob',
}))

vi.mock('./UI.js', () => ({
  getToolUseSummary: vi.fn(),
  renderToolResultMessage: vi.fn(),
  renderToolUseErrorMessage: vi.fn(),
  renderToolUseMessage: vi.fn(),
  userFacingName: vi.fn(() => 'Glob'),
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
    endsWith: vi.fn().mockReturnThis(),
    trim: vi.fn().mockReturnThis(),
    transform: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    refine: vi.fn().mockReturnThis(),
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
    strip: vi.fn().mockReturnThis(),
    shape: {
      pattern: createChainable(),
      path: createChainable(),
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
    partialRecord: vi.fn(() => createChainable()),
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
  DependencyRefSchema: vi.fn(() => ({})),
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

// Import after mocks
const { GlobTool } = await import('../../../src/tools/GlobTool/GlobTool.js')

describe('GlobTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(GlobTool.name).toBe('Glob')
    })

    it('应该是只读工具', () => {
      expect(GlobTool.isReadOnly()).toBe(true)
    })

    it('应该支持并发', () => {
      expect(GlobTool.isConcurrencySafe()).toBe(true)
    })

    it('应该返回正确的用户可见名称', () => {
      expect(GlobTool.userFacingName()).toBe('Search')
    })

    it('应该返回正确的活动描述', () => {
      const result = GlobTool.getActivityDescription({
        pattern: '*.ts',
      })
      expect(result).toContain('Finding')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(GlobTool.inputSchema).toBeDefined()
    })

    it('应该要求 pattern 字段', () => {
      const schema = GlobTool.inputSchema
      expect(schema.shape.pattern).toBeDefined()
    })

    it('path 应该是可选的', () => {
      const schema = GlobTool.inputSchema
      expect(schema.shape.path).toBeDefined()
    })
  })

  describe('getPath', () => {
    it('应该返回 path 当提供时', () => {
      const result = GlobTool.getPath({ pattern: '*.ts', path: '/test/dir' })
      expect(result).toBe('/test/dir')
    })

    it('应该返回 cwd 当 path 未提供时', async () => {
      const { getCwd } = await import('../../../src/utils/cwd.js')
      vi.mocked(getCwd).mockReturnValue('/test/cwd')

      const result = GlobTool.getPath({ pattern: '*.ts' })
      expect(result).toBe('/test/cwd')
    })
  })

  describe('toAutoClassifierInput', () => {
    it('应该返回 pattern', () => {
      const result = GlobTool.toAutoClassifierInput({ pattern: '*.ts' })
      expect(result).toBe('*.ts')
    })
  })

  describe('isSearchOrReadCommand', () => {
    it('应该返回 isSearch: true', () => {
      const result = GlobTool.isSearchOrReadCommand()
      expect(result).toEqual({ isSearch: true, isRead: false })
    })
  })
})
