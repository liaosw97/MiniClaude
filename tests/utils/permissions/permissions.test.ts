import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock 所有外部依赖
vi.mock('bun:bundle', () => ({
  feature: vi.fn(() => false),
}))

vi.mock('src/hooks/useCanUseTool.js', () => ({}))

vi.mock('src/services/mcp/mcpStringUtils.js', () => ({
  getToolNameForPermissionCheck: vi.fn((name: string) => name),
  mcpInfoFromString: vi.fn(() => null),
}))

vi.mock('src/Tool.js', () => ({}))

vi.mock('src/tools/AgentTool/constants.js', () => ({
  AGENT_TOOL_NAME: 'Agent',
}))

vi.mock('src/tools/BashTool/shouldUseSandbox.js', () => ({
  shouldUseSandbox: vi.fn(() => false),
}))

vi.mock('src/tools/BashTool/toolName.js', () => ({
  BASH_TOOL_NAME: 'Bash',
}))

vi.mock('src/tools/PowerShellTool/toolName.js', () => ({
  POWERSHELL_TOOL_NAME: 'PowerShell',
}))

vi.mock('src/tools/REPLTool/constants.js', () => ({
  REPL_TOOL_NAME: 'REPL',
}))

vi.mock('src/types/message.js', () => ({}))

vi.mock('src/utils/bash/commands.js', () => ({
  extractOutputRedirections: vi.fn((cmd: string) => ({
    commandWithoutRedirections: cmd,
    redirections: [],
  })),
}))

vi.mock('src/utils/debug.js', () => ({
  logForDebugging: vi.fn(),
}))

vi.mock('src/utils/errors.js', () => ({
  AbortError: class AbortError extends Error {},
  toError: vi.fn((e: any) => e),
}))

vi.mock('src/utils/log.js', () => ({
  logError: vi.fn(),
}))

vi.mock('src/utils/sandbox/sandbox-adapter.js', () => ({
  SandboxManager: class SandboxManager {},
}))

vi.mock('src/utils/settings/constants.js', () => ({
  getSettingSourceDisplayNameLowercase: vi.fn((source: string) => source),
  SETTING_SOURCES: ['globalSettings', 'projectSettings', 'localSettings'],
}))

vi.mock('src/utils/stringUtils.js', () => ({
  plural: vi.fn((count: number, singular: string, plural: string) =>
    count === 1 ? singular : plural,
  ),
}))

vi.mock('src/utils/permissions/PermissionMode.js', () => ({
  permissionModeTitle: vi.fn((mode: string) => mode),
}))

vi.mock('src/utils/permissions/PermissionResult.js', () => ({}))

vi.mock('src/utils/permissions/PermissionRule.js', () => ({}))

vi.mock('src/utils/permissions/PermissionUpdate.js', () => ({
  applyPermissionUpdate: vi.fn(),
  applyPermissionUpdates: vi.fn(),
  persistPermissionUpdates: vi.fn(),
}))

vi.mock('src/utils/permissions/PermissionUpdateSchema.js', () => ({}))

vi.mock('src/utils/permissions/permissionRuleParser.js', () => ({
  permissionRuleValueFromString: vi.fn((s: string) => ({ type: 'tool', pattern: s })),
  permissionRuleValueToString: vi.fn((v: any) => v.pattern || String(v)),
}))

vi.mock('src/utils/permissions/permissionsLoader.js', () => ({
  deletePermissionRuleFromSettings: vi.fn(),
  shouldAllowManagedPermissionRulesOnly: vi.fn(() => false),
}))

vi.mock('src/bootstrap/state.js', () => ({
  addToTurnClassifierDuration: vi.fn(),
  getTotalCacheCreationInputTokens: vi.fn(() => 0),
  getTotalCacheReadInputTokens: vi.fn(() => 0),
  getTotalInputTokens: vi.fn(() => 0),
  getTotalOutputTokens: vi.fn(() => 0),
}))

vi.mock('src/services/analytics/growthbook.js', () => ({
  getFeatureValue_CACHED_WITH_REFRESH: vi.fn(() => false),
}))

vi.mock('src/services/analytics/index.js', () => ({
  logEvent: vi.fn(),
}))

vi.mock('src/services/analytics/metadata.js', () => ({
  sanitizeToolNameForAnalytics: vi.fn((name: string) => name),
}))

vi.mock('src/utils/classifierApprovals.js', () => ({
  clearClassifierChecking: vi.fn(),
  setClassifierChecking: vi.fn(),
}))

vi.mock('src/utils/envUtils.js', () => ({
  isInProtectedNamespace: vi.fn(() => false),
}))

vi.mock('src/utils/hooks.js', () => ({
  executePermissionRequestHooks: vi.fn(() => Promise.resolve()),
}))

vi.mock('src/utils/messages.js', () => ({
  AUTO_REJECT_MESSAGE: 'Auto rejected',
  buildClassifierUnavailableMessage: vi.fn(() => 'Classifier unavailable'),
  buildYoloRejectionMessage: vi.fn(() => 'YOLO rejected'),
  DONT_ASK_REJECT_MESSAGE: 'Dont ask rejected',
}))

vi.mock('src/utils/modelCost.js', () => ({
  calculateCostFromTokens: vi.fn(() => 0),
}))

vi.mock('src/utils/slowOperations.js', () => ({
  jsonStringify: JSON.stringify,
}))

vi.mock('src/utils/permissions/denialTracking.js', () => ({
  createDenialTrackingState: vi.fn(() => ({})),
  DENIAL_LIMITS: { maxDenials: 3 },
  recordDenial: vi.fn(),
  recordSuccess: vi.fn(),
  shouldFallbackToPrompting: vi.fn(() => false),
}))

vi.mock('src/utils/permissions/yoloClassifier.js', () => ({
  classifyYoloAction: vi.fn(() => Promise.resolve({ decision: 'allow' })),
  formatActionForClassifier: vi.fn(() => ''),
}))

// 需要 mock classifierDecision 和 autoModeState 模块
vi.mock('src/utils/permissions/classifierDecision.js', () => ({
  checkClassifierDecision: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('src/utils/permissions/autoModeState.js', () => ({
  getAutoModeState: vi.fn(() => null),
}))

import { permissionRuleSourceDisplayString } from '../../../src/utils/permissions/permissions'

describe('permissions', () => {
  describe('permissionRuleSourceDisplayString', () => {
    it('返回设置源的显示名称', () => {
      const result = permissionRuleSourceDisplayString('globalSettings' as any)
      expect(result).toBe('globalSettings')
    })

    it('处理 cliArg 源', () => {
      const result = permissionRuleSourceDisplayString('cliArg' as any)
      expect(result).toBe('cliArg')
    })

    it('处理 command 源', () => {
      const result = permissionRuleSourceDisplayString('command' as any)
      expect(result).toBe('command')
    })

    it('处理 session 源', () => {
      const result = permissionRuleSourceDisplayString('session' as any)
      expect(result).toBe('session')
    })
  })
})
