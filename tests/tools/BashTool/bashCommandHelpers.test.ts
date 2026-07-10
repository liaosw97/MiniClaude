import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CommandIdentityCheckers } from '../../../src/tools/BashTool/bashCommandHelpers.js'

// Mock all dependencies before importing
vi.mock('../../../src/tools/BashTool/BashTool.js', () => ({
  BashTool: {
    name: 'BashTool',
    inputSchema: {},
  },
}))

const mockIsUnsafeCompoundCommand = vi.fn(() => false)
const mockSplitCommand = vi.fn((cmd: string) => [cmd])
const mockBuildParsedCommandFromRoot = vi.fn()
const mockParsedCommandParse = vi.fn()
const mockCreatePermissionRequestMessage = vi.fn((toolName: string, reason: any) => `Permission required: ${reason.reason}`)
const mockBashCommandIsSafeAsync = vi.fn(() => ({ behavior: 'allow' }))

vi.mock('../../../src/utils/bash/commands.js', () => ({
  isUnsafeCompoundCommand_DEPRECATED: mockIsUnsafeCompoundCommand,
  splitCommand_DEPRECATED: mockSplitCommand,
}))

vi.mock('../../../src/utils/bash/ParsedCommand.js', () => ({
  buildParsedCommandFromRoot: mockBuildParsedCommandFromRoot,
  ParsedCommand: {
    parse: mockParsedCommandParse,
  },
}))

vi.mock('../../../src/utils/bash/parser.js', () => ({
  PARSE_ABORTED: Symbol('PARSE_ABORTED'),
}))

vi.mock('../../../src/utils/permissions/permissions.js', () => ({
  createPermissionRequestMessage: mockCreatePermissionRequestMessage,
}))

vi.mock('../../../src/tools/BashTool/bashSecurity.js', () => ({
  bashCommandIsSafeAsync_DEPRECATED: mockBashCommandIsSafeAsync,
}))

// Import after mocks
const { checkCommandOperatorPermissions } = await import('../../../src/tools/BashTool/bashCommandHelpers.js')

describe('bashCommandHelpers', () => {
  const mockInput = {
    command: 'test command',
    description: 'test',
    timeout: 1000,
  }

  const mockCheckers: CommandIdentityCheckers = {
    isNormalizedCdCommand: vi.fn(() => false),
    isNormalizedGitCommand: vi.fn(() => false),
  }

  const mockBashToolHasPermissionFn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkCommandOperatorPermissions', () => {
    it('当 AST 解析失败时应该返回 passthrough', async () => {
      mockParsedCommandParse.mockResolvedValue(null)

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        mockCheckers,
        null,
      )

      expect(result).toEqual({
        behavior: 'passthrough',
        message: 'Failed to parse command',
      })
    })

    it('当命令没有管道时应该返回 passthrough', async () => {
      const mockParsed = {
        getTreeSitterAnalysis: vi.fn(() => null),
        getPipeSegments: vi.fn(() => ['test command']),
        withoutOutputRedirections: vi.fn(),
      }
      mockParsedCommandParse.mockResolvedValue(mockParsed)
      mockIsUnsafeCompoundCommand.mockReturnValue(false)

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        mockCheckers,
        null,
      )

      expect(result).toEqual({
        behavior: 'passthrough',
        message: 'No pipes found in command',
      })
    })

    it('当命令是不安全的复合命令时应该返回 ask', async () => {
      const mockParsed = {
        getTreeSitterAnalysis: vi.fn(() => ({
          compoundStructure: {
            hasSubshell: true,
            hasCommandGroup: false,
          },
        })),
        getPipeSegments: vi.fn(),
        withoutOutputRedirections: vi.fn(),
      }
      mockParsedCommandParse.mockResolvedValue(mockParsed)

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        mockCheckers,
        null,
      )

      expect(result.behavior).toBe('ask')
      expect(result.message).toContain('Permission required')
    })

    it('当管道命令的所有段都允许时应该返回 allow', async () => {
      const mockParsed = {
        getTreeSitterAnalysis: vi.fn(() => null),
        getPipeSegments: vi.fn(() => ['cmd1', 'cmd2']),
        withoutOutputRedirections: vi.fn(),
      }
      mockParsedCommandParse.mockResolvedValue(mockParsed)
      mockIsUnsafeCompoundCommand.mockReturnValue(false)
      mockBashToolHasPermissionFn.mockResolvedValue({ behavior: 'allow' })

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        mockCheckers,
        null,
      )

      expect(result.behavior).toBe('allow')
    })

    it('当管道命令的某个段被拒绝时应该返回 deny', async () => {
      const mockParsed = {
        getTreeSitterAnalysis: vi.fn(() => null),
        getPipeSegments: vi.fn(() => ['cmd1', 'cmd2']),
        withoutOutputRedirections: vi.fn(),
      }
      mockParsedCommandParse.mockResolvedValue(mockParsed)
      mockIsUnsafeCompoundCommand.mockReturnValue(false)
      mockBashToolHasPermissionFn
        .mockResolvedValueOnce({ behavior: 'allow' })
        .mockResolvedValueOnce({ behavior: 'deny', message: 'Denied' })

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        mockCheckers,
        null,
      )

      expect(result.behavior).toBe('deny')
    })

    it('当管道命令有多个 cd 命令时应该返回 ask', async () => {
      const mockParsed = {
        getTreeSitterAnalysis: vi.fn(() => null),
        getPipeSegments: vi.fn(() => ['cd dir1', 'cd dir2']),
        withoutOutputRedirections: vi.fn(),
      }
      mockParsedCommandParse.mockResolvedValue(mockParsed)
      mockIsUnsafeCompoundCommand.mockReturnValue(false)

      const checkersWithCd: CommandIdentityCheckers = {
        isNormalizedCdCommand: vi.fn(() => true),
        isNormalizedGitCommand: vi.fn(() => false),
      }

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        checkersWithCd,
        null,
      )

      expect(result.behavior).toBe('ask')
      expect(result.message).toContain('Multiple directory changes')
    })

    it('当管道命令包含 cd 和 git 时应该返回 ask', async () => {
      const mockParsed = {
        getTreeSitterAnalysis: vi.fn(() => null),
        getPipeSegments: vi.fn(() => ['cd dir', 'git status']),
        withoutOutputRedirections: vi.fn(),
      }
      mockParsedCommandParse.mockResolvedValue(mockParsed)
      mockIsUnsafeCompoundCommand.mockReturnValue(false)

      const checkersWithCdGit: CommandIdentityCheckers = {
        isNormalizedCdCommand: vi.fn((cmd: string) => cmd.startsWith('cd')),
        isNormalizedGitCommand: vi.fn((cmd: string) => cmd.startsWith('git')),
      }

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        checkersWithCdGit,
        null,
      )

      expect(result.behavior).toBe('ask')
      expect(result.message).toContain('cd and git')
    })

    it('当使用预解析的 AST root 时应该使用它', async () => {
      const mockAstRoot = { type: 'command' }
      const mockParsed = {
        getTreeSitterAnalysis: vi.fn(() => null),
        getPipeSegments: vi.fn(() => ['test command']),
        withoutOutputRedirections: vi.fn(),
      }
      mockBuildParsedCommandFromRoot.mockReturnValue(mockParsed)
      mockIsUnsafeCompoundCommand.mockReturnValue(false)

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        mockCheckers,
        mockAstRoot as any,
      )

      expect(mockBuildParsedCommandFromRoot).toHaveBeenCalledWith('test command', mockAstRoot)
      expect(result).toEqual({
        behavior: 'passthrough',
        message: 'No pipes found in command',
      })
    })

    it('当 AST root 是 PARSE_ABORTED 时应该使用 ParsedCommand.parse', async () => {
      const { PARSE_ABORTED } = await import('../../../src/utils/bash/parser.js')
      const mockParsed = {
        getTreeSitterAnalysis: vi.fn(() => null),
        getPipeSegments: vi.fn(() => ['test command']),
        withoutOutputRedirections: vi.fn(),
      }
      mockParsedCommandParse.mockResolvedValue(mockParsed)
      mockIsUnsafeCompoundCommand.mockReturnValue(false)

      const result = await checkCommandOperatorPermissions(
        mockInput as any,
        mockBashToolHasPermissionFn,
        mockCheckers,
        PARSE_ABORTED,
      )

      expect(mockParsedCommandParse).toHaveBeenCalledWith('test command')
      expect(result).toEqual({
        behavior: 'passthrough',
        message: 'No pipes found in command',
      })
    })
  })
})
