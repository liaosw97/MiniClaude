import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 所有外部依赖
vi.mock('../../../src/Tool.js', () => ({
  buildTool: vi.fn((config: any) => config),
}))

vi.mock('../../../src/utils/format.js', () => ({
  formatFileSize: vi.fn((size: number) => `${size} bytes`),
  truncate: vi.fn((str: string, len: number) => str.slice(0, len)),
}))

vi.mock('../../../src/utils/lazySchema.js', () => ({
  lazySchema: vi.fn((fn: () => any) => {
    const result = fn()
    return () => result
  }),
}))

vi.mock('../../../src/utils/permissions/permissions.js', () => ({
  getRuleByContentsForTool: vi.fn(),
}))

vi.mock('../../../src/utils/permissions/PermissionResult.js', () => ({}))

vi.mock('./preapproved.js', () => ({
  isPreapprovedHost: vi.fn(),
}))

vi.mock('./prompt.js', () => ({
  DESCRIPTION: 'Fetch content from URL',
  WEB_FETCH_TOOL_NAME: 'WebFetch',
}))

vi.mock('./UI.js', () => ({
  getToolUseSummary: vi.fn(),
  renderToolResultMessage: vi.fn(),
  renderToolUseMessage: vi.fn(),
  renderToolUseProgressMessage: vi.fn(),
}))

vi.mock('./utils.js', () => ({
  applyPromptToMarkdown: vi.fn(),
  getURLMarkdownContent: vi.fn(),
  isPreapprovedUrl: vi.fn(),
  MAX_MARKDOWN_LENGTH: 100000,
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
      url: createChainable(),
      prompt: createChainable(),
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

vi.mock('../../../src/components/messages/RateLimitMessage.tsx', () => ({
  default: vi.fn(),
}))

vi.mock('../../../src/commands.ts', () => ({
  getCommands: vi.fn(() => []),
}))

vi.mock('../../../src/utils/errors.js', () => ({
  isENOENT: vi.fn(),
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS: class extends Error {},
  ClaudeError: class extends Error {},
}))

vi.mock('../../../src/utils/cwd.js', () => ({
  getCwd: vi.fn(() => '/test/cwd'),
}))

vi.mock('../../../src/utils/path.js', () => ({
  expandPath: vi.fn((p: string) => p),
  toRelativePath: vi.fn((p: string) => p),
}))

vi.mock('../../../src/utils/fsOperations.js', () => ({
  getFsImplementation: vi.fn(() => ({
    stat: vi.fn(),
  })),
  getPathsForPermissionCheck: vi.fn(),
}))

vi.mock('../../../src/utils/permissions/filesystem.js', () => ({
  checkReadPermissionForTool: vi.fn(),
  getFileReadIgnorePatterns: vi.fn(),
  normalizePatternsToPath: vi.fn(),
}))

vi.mock('../../../src/utils/permissions/shellRuleMatching.js', () => ({
  matchWildcardPattern: vi.fn(),
  permissionRuleExtractPrefix: vi.fn(),
  parsePermissionRule: vi.fn(),
}))

vi.mock('../../../src/utils/stringUtils.js', () => ({
  plural: vi.fn((count: number, singular: string, plural: string) =>
    count === 1 ? singular : plural
  ),
  truncate: vi.fn((str: string, len: number) => str.slice(0, len)),
  TOOL_SUMMARY_MAX_LENGTH: 50,
}))

vi.mock('../../../src/tools/GlobTool/UI.js', () => ({
  getToolUseSummary: vi.fn(),
  renderToolResultMessage: vi.fn(),
  renderToolUseErrorMessage: vi.fn(),
  renderToolUseMessage: vi.fn(),
  userFacingName: vi.fn(() => 'Search'),
}))

vi.mock('../../../src/utils/semanticBoolean.js', () => ({
  semanticBoolean: vi.fn((schema) => schema),
}))

vi.mock('../../../src/utils/semanticNumber.js', () => ({
  semanticNumber: vi.fn((schema) => schema),
}))

vi.mock('../../../src/utils/ripgrep.js', () => ({
  ripGrep: vi.fn(),
}))

vi.mock('../../../src/utils/plugins/orphanedPluginFilter.js', () => ({
  getGlobExclusionsForPluginCache: vi.fn(),
}))

// Import after mocks
const { WebFetchTool } = await import('../../../src/tools/WebFetchTool/WebFetchTool.js')

describe('WebFetchTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(WebFetchTool.name).toBe('WebFetch')
    })

    it('应该返回正确的用户可见名称', () => {
      expect(WebFetchTool.userFacingName()).toBe('Fetch')
    })

    it('应该返回正确的活动描述', () => {
      const result = WebFetchTool.getActivityDescription({
        url: 'https://example.com',
        prompt: 'test',
      })
      expect(result).toContain('Fetching')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(WebFetchTool.inputSchema).toBeDefined()
    })

    it('应该要求 url 字段', () => {
      const schema = WebFetchTool.inputSchema
      expect(schema.shape.url).toBeDefined()
    })

    it('应该要求 prompt 字段', () => {
      const schema = WebFetchTool.inputSchema
      expect(schema.shape.prompt).toBeDefined()
    })
  })

  describe('输出模式', () => {
    it('应该定义输出模式', () => {
      expect(WebFetchTool.outputSchema).toBeDefined()
    })
  })

  describe('description', () => {
    it('应该返回包含 hostname 的描述', async () => {
      const result = await WebFetchTool.description({
        url: 'https://example.com',
        prompt: 'test',
      })
      expect(result).toContain('example.com')
    })

    it('应该处理无效 URL', async () => {
      const result = await WebFetchTool.description({
        url: 'invalid-url',
        prompt: 'test',
      })
      expect(result).toContain('URL')
    })
  })

  describe('toAutoClassifierInput', () => {
    it('应该返回 url 和 prompt', () => {
      const result = WebFetchTool.toAutoClassifierInput({
        url: 'https://example.com',
        prompt: 'test',
      })
      expect(result).toBe('https://example.com: test')
    })
  })

  describe('isConcurrencySafe', () => {
    it('应该返回 true', () => {
      expect(WebFetchTool.isConcurrencySafe()).toBe(true)
    })
  })

  describe('isReadOnly', () => {
    it('应该返回 true', () => {
      expect(WebFetchTool.isReadOnly()).toBe(true)
    })
  })

  describe('shouldDefer', () => {
    it('应该返回 true', () => {
      expect(WebFetchTool.shouldDefer).toBe(true)
    })
  })
})
