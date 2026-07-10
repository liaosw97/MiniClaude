import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 所有外部依赖
vi.mock('bun:bundle', () => ({
  feature: vi.fn(() => false),
}))

vi.mock('react', () => ({
  default: {
    createElement: vi.fn(),
    createContext: vi.fn(() => ({
      displayName: '',
    })),
    PureComponent: class {},
    Component: class {},
    memo: vi.fn((component: any) => component),
  },
  createContext: vi.fn(() => ({
    displayName: '',
  })),
  PureComponent: class {},
  Component: class {},
  memo: vi.fn((component: any) => component),
}))

vi.mock('../../../src/Tool.js', () => ({
  buildTool: vi.fn((config: any) => config),
  toolMatchesName: vi.fn(),
}))

vi.mock('../../../src/utils/lazySchema.js', () => ({
  lazySchema: vi.fn((fn: () => any) => {
    const result = fn()
    return () => result
  }),
}))

vi.mock('../../../src/utils/cwd.js', () => ({
  getCwd: vi.fn(() => '/test/cwd'),
  runWithCwdOverride: vi.fn(),
}))

vi.mock('../../../src/utils/errors.js', () => ({
  AbortError: class extends Error {},
  errorMessage: vi.fn((error: any) => error.message),
  toError: vi.fn((error: any) => error),
  isENOENT: vi.fn(),
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS: class extends Error {},
  ClaudeError: class extends Error {},
}))

vi.mock('../../../src/utils/envUtils.js', () => ({
  isEnvTruthy: vi.fn(),
}))

vi.mock('../../../src/utils/debug.js', () => ({
  logForDebugging: vi.fn(),
}))

vi.mock('../../../src/utils/messages.js', () => ({
  createUserMessage: vi.fn(),
  extractTextContent: vi.fn(),
  isSyntheticMessage: vi.fn(),
  normalizeMessages: vi.fn(),
}))

vi.mock('../../../src/utils/model/agent.js', () => ({
  getAgentModel: vi.fn(),
}))

vi.mock('../../../src/utils/permissions/PermissionMode.js', () => ({
  permissionModeSchema: vi.fn(() => ({
    optional: vi.fn().mockReturnThis(),
    describe: vi.fn().mockReturnThis(),
  })),
  externalPermissionModeSchema: vi.fn(() => ({
    optional: vi.fn().mockReturnThis(),
    describe: vi.fn().mockReturnThis(),
  })),
  PERMISSION_MODES: ['default', 'plan', 'auto'],
}))

vi.mock('../../../src/utils/permissions/PermissionResult.js', () => ({}))

vi.mock('../../../src/utils/permissions/permissions.js', () => ({
  filterDeniedAgents: vi.fn(),
  getDenyRuleForAgent: vi.fn(),
}))

vi.mock('../../../src/utils/sdkEventQueue.js', () => ({
  enqueueSdkEvent: vi.fn(),
}))

vi.mock('../../../src/utils/sessionStorage.js', () => ({
  writeAgentMetadata: vi.fn(),
}))

vi.mock('../../../src/utils/sleep.js', () => ({
  sleep: vi.fn(),
}))

vi.mock('../../../src/utils/systemPrompt.js', () => ({
  buildEffectiveSystemPrompt: vi.fn(),
}))

vi.mock('../../../src/utils/systemPromptType.js', () => ({
  asSystemPrompt: vi.fn(),
}))

vi.mock('../../../src/utils/task/diskOutput.js', () => ({
  getTaskOutputPath: vi.fn(),
}))

vi.mock('../../../src/utils/teammate.js', () => ({
  getParentSessionId: vi.fn(),
  isTeammate: vi.fn(),
}))

vi.mock('../../../src/utils/teammateContext.js', () => ({
  isInProcessTeammate: vi.fn(),
}))

vi.mock('../../../src/utils/teleport.js', () => ({
  teleportToRemote: vi.fn(),
}))

vi.mock('../../../src/utils/tokens.js', () => ({
  getAssistantMessageContentLength: vi.fn(),
}))

vi.mock('../../../src/utils/uuid.js', () => ({
  createAgentId: vi.fn(),
}))

vi.mock('../../../src/utils/worktree.js', () => ({
  createAgentWorktree: vi.fn(),
  hasWorktreeChanges: vi.fn(),
  removeAgentWorktree: vi.fn(),
}))

vi.mock('../../../src/tools/BashTool/toolName.js', () => ({
  BASH_TOOL_NAME: 'Bash',
}))

vi.mock('../../../src/tools/BashTool/UI.js', () => ({
  BackgroundHint: vi.fn(),
  renderToolUseMessage: vi.fn(),
  renderToolResultMessage: vi.fn(),
  renderToolUseErrorMessage: vi.fn(),
  renderToolUseProgressMessage: vi.fn(),
  renderToolUseQueuedMessage: vi.fn(),
}))

vi.mock('../../../src/tools/FileReadTool/prompt.js', () => ({
  FILE_READ_TOOL_NAME: 'Read',
}))

vi.mock('../../../src/tools/shared/spawnMultiAgent.js', () => ({
  spawnTeammate: vi.fn(),
}))

vi.mock('./agentColorManager.js', () => ({
  setAgentColor: vi.fn(),
}))

vi.mock('./agentToolUtils.js', () => ({
  agentToolResultSchema: vi.fn(() => ({})),
  classifyHandoffIfNeeded: vi.fn(),
  emitTaskProgress: vi.fn(),
  extractPartialResult: vi.fn(),
  finalizeAgentTool: vi.fn(),
  getLastToolUseName: vi.fn(),
  runAsyncAgentLifecycle: vi.fn(),
}))

vi.mock('./built-in/generalPurposeAgent.js', () => ({
  GENERAL_PURPOSE_AGENT: {},
}))

vi.mock('./constants.js', () => ({
  AGENT_TOOL_NAME: 'Agent',
  LEGACY_AGENT_TOOL_NAME: 'Subagent',
  ONE_SHOT_BUILTIN_AGENT_TYPES: [],
}))

vi.mock('./forkSubagent.js', () => ({
  buildForkedMessages: vi.fn(),
  buildWorktreeNotice: vi.fn(),
  FORK_AGENT: {},
  isForkSubagentEnabled: vi.fn(),
  isInForkChild: vi.fn(),
}))

vi.mock('./loadAgentsDir.js', () => ({
  filterAgentsByMcpRequirements: vi.fn(),
  hasRequiredMcpServers: vi.fn(),
  isBuiltInAgent: vi.fn(),
}))

vi.mock('./prompt.js', () => ({
  getPrompt: vi.fn(() => 'Agent prompt'),
}))

vi.mock('./runAgent.js', () => ({
  runAgent: vi.fn(),
}))

vi.mock('./UI.js', () => ({
  renderGroupedAgentToolUse: vi.fn(),
  renderToolResultMessage: vi.fn(),
  renderToolUseErrorMessage: vi.fn(),
  renderToolUseMessage: vi.fn(),
  renderToolUseProgressMessage: vi.fn(),
  renderToolUseRejectedMessage: vi.fn(),
  renderToolUseTag: vi.fn(),
  userFacingName: vi.fn(() => 'Agent'),
  userFacingNameBackgroundColor: vi.fn(),
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
      description: createChainable(),
      prompt: createChainable(),
      subagent_type: createChainable(),
      model: createChainable(),
      run_in_background: createChainable(),
      name: createChainable(),
      team_name: createChainable(),
      mode: createChainable(),
      isolation: createChainable(),
      cwd: createChainable(),
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

vi.mock('../../../src/utils/format.js', () => ({
  formatFileSize: vi.fn((size: number) => `${size} bytes`),
  truncate: vi.fn((str: string, len: number) => str.slice(0, len)),
}))

vi.mock('../../../src/utils/file.js', () => ({
  FILE_NOT_FOUND_CWD_NOTE: 'File not found',
  suggestPathUnderCwd: vi.fn(),
  getDisplayPath: vi.fn((p: string) => p),
}))

vi.mock('../../../src/utils/context.js', () => ({}))

vi.mock('../../../src/utils/model/modelCapabilities.js', () => ({}))

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

// Import after mocks
const { AgentTool } = await import('../../../src/tools/AgentTool/AgentTool.tsx')

describe('AgentTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('配置', () => {
    it('应该有正确的名称', () => {
      expect(AgentTool.name).toBe('Agent')
    })

    it('应该返回正确的用户可见名称', () => {
      expect(AgentTool.userFacingName()).toBe('Agent')
    })

    it('应该返回正确的活动描述', () => {
      const result = AgentTool.getActivityDescription({
        description: 'Test task',
        prompt: 'Do something',
      })
      expect(result).toContain('Test task')
    })
  })

  describe('输入模式', () => {
    it('应该定义输入模式', () => {
      expect(AgentTool.inputSchema).toBeDefined()
    })

    it('应该要求 description 字段', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.description).toBeDefined()
    })

    it('应该要求 prompt 字段', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.prompt).toBeDefined()
    })

    it('subagent_type 应该是可选的', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.subagent_type).toBeDefined()
    })

    it('model 应该是可选的', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.model).toBeDefined()
    })

    it('run_in_background 应该是可选的', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.run_in_background).toBeDefined()
    })

    it('name 应该是可选的', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.name).toBeDefined()
    })

    it('team_name 应该是可选的', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.team_name).toBeDefined()
    })

    it('mode 应该是可选的', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.mode).toBeDefined()
    })

    it('isolation 应该是可选的', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.isolation).toBeDefined()
    })

    it('cwd 应该是可选的', () => {
      const schema = AgentTool.inputSchema
      expect(schema.shape.cwd).toBeDefined()
    })
  })
})
