import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('src/utils/platform.js', () => ({
  getPlatform: vi.fn(() => 'windows'),
}))

vi.mock('src/utils/envUtils.js', () => ({
  isEnvDefinedFalsy: vi.fn((v: string | undefined) => v === '0' || v === 'false'),
  isEnvTruthy: vi.fn((v: string | undefined) => v === '1' || v === 'true'),
}))

import { getPlatform } from 'src/utils/platform.js'
import { isPowerShellToolEnabled, SHELL_TOOL_NAMES } from '../../../src/utils/shell/shellToolUtils'

describe('shellToolUtils', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  describe('SHELL_TOOL_NAMES', () => {
    it('包含 Bash 和 PowerShell 工具名', () => {
      expect(SHELL_TOOL_NAMES).toContain('Bash')
      expect(SHELL_TOOL_NAMES).toContain('PowerShell')
    })
  })

  describe('isPowerShellToolEnabled', () => {
    it('非 Windows 平台 → false', () => {
      vi.mocked(getPlatform).mockReturnValue('linux' as any)
      expect(isPowerShellToolEnabled()).toBe(false)
    })

    describe('Windows + ant 用户', () => {
      beforeEach(() => {
        vi.mocked(getPlatform).mockReturnValue('windows' as any)
        process.env.USER_TYPE = 'ant'
      })

      it('未设置环境变量 → true（默认开启）', () => {
        delete process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL
        expect(isPowerShellToolEnabled()).toBe(true)
      })

      it('设置为 "0" → false（opt-out）', () => {
        process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL = '0'
        expect(isPowerShellToolEnabled()).toBe(false)
      })

      it('设置为 "false" → false（opt-out）', () => {
        process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL = 'false'
        expect(isPowerShellToolEnabled()).toBe(false)
      })

      it('设置为 "1" → true', () => {
        process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL = '1'
        expect(isPowerShellToolEnabled()).toBe(true)
      })
    })

    describe('Windows + 非 ant 用户', () => {
      beforeEach(() => {
        vi.mocked(getPlatform).mockReturnValue('windows' as any)
        process.env.USER_TYPE = 'external'
      })

      it('未设置环境变量 → false（默认关闭）', () => {
        delete process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL
        expect(isPowerShellToolEnabled()).toBe(false)
      })

      it('设置为 "1" → true（opt-in）', () => {
        process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL = '1'
        expect(isPowerShellToolEnabled()).toBe(true)
      })

      it('设置为 "true" → true（opt-in）', () => {
        process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL = 'true'
        expect(isPowerShellToolEnabled()).toBe(true)
      })

      it('设置为 "0" → false', () => {
        process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL = '0'
        expect(isPowerShellToolEnabled()).toBe(false)
      })
    })
  })
})
