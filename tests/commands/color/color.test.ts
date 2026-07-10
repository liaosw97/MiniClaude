import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('../../../src/bootstrap/state.js', () => ({
  getSessionId: vi.fn(() => 'test-session-id'),
}))

vi.mock('../../../src/tools/AgentTool/agentColorManager.js', () => ({
  AGENT_COLORS: ['red', 'blue', 'green', 'yellow', 'purple'],
  AgentColorName: {},
}))

vi.mock('../../../src/utils/sessionStorage.js', () => ({
  getTranscriptPath: vi.fn(() => '/mock/transcript/path'),
  saveAgentColor: vi.fn(),
}))

vi.mock('../../../src/utils/teammate.js', () => ({
  isTeammate: vi.fn(() => false),
}))

// Import after mocks
const { call } = await import('../../../src/commands/color/color.js')
const { isTeammate } = await import('../../../src/utils/teammate.js')
const { saveAgentColor } = await import('../../../src/utils/sessionStorage.js')

describe('color 命令', () => {
  const mockOnDone = vi.fn()
  const mockContext = {
    setAppState: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isTeammate).mockReturnValue(false)
  })

  describe('基本功能', () => {
    it('当没有参数时应该提示提供颜色', async () => {
      await call(mockOnDone, mockContext as any, '')

      expect(mockOnDone).toHaveBeenCalledWith(
        expect.stringContaining('Please provide a color'),
        { display: 'system' },
      )
    })

    it('当参数为空格时应该提示提供颜色', async () => {
      await call(mockOnDone, mockContext as any, '   ')

      expect(mockOnDone).toHaveBeenCalledWith(
        expect.stringContaining('Please provide a color'),
        { display: 'system' },
      )
    })

    it('应该支持有效颜色', async () => {
      await call(mockOnDone, mockContext as any, 'red')

      expect(saveAgentColor).toHaveBeenCalledWith(
        'test-session-id',
        'red',
        '/mock/transcript/path',
      )
      expect(mockOnDone).toHaveBeenCalledWith(
        'Session color set to: red',
        { display: 'system' },
      )
    })

    it('应该支持大写颜色', async () => {
      await call(mockOnDone, mockContext as any, 'BLUE')

      expect(saveAgentColor).toHaveBeenCalledWith(
        'test-session-id',
        'blue',
        '/mock/transcript/path',
      )
    })

    it('应该拒绝无效颜色', async () => {
      await call(mockOnDone, mockContext as any, 'invalid')

      expect(mockOnDone).toHaveBeenCalledWith(
        expect.stringContaining('Invalid color "invalid"'),
        { display: 'system' },
      )
    })
  })

  describe('重置颜色', () => {
    it('应该支持 default 重置', async () => {
      await call(mockOnDone, mockContext as any, 'default')

      expect(saveAgentColor).toHaveBeenCalledWith(
        'test-session-id',
        'default',
        '/mock/transcript/path',
      )
      expect(mockOnDone).toHaveBeenCalledWith(
        'Session color reset to default',
        { display: 'system' },
      )
    })

    it('应该支持 reset 重置', async () => {
      await call(mockOnDone, mockContext as any, 'reset')

      expect(mockOnDone).toHaveBeenCalledWith(
        'Session color reset to default',
        { display: 'system' },
      )
    })

    it('应该支持 none 重置', async () => {
      await call(mockOnDone, mockContext as any, 'none')

      expect(mockOnDone).toHaveBeenCalledWith(
        'Session color reset to default',
        { display: 'system' },
      )
    })

    it('应该支持 gray 重置', async () => {
      await call(mockOnDone, mockContext as any, 'gray')

      expect(mockOnDone).toHaveBeenCalledWith(
        'Session color reset to default',
        { display: 'system' },
      )
    })

    it('应该支持 grey 重置', async () => {
      await call(mockOnDone, mockContext as any, 'grey')

      expect(mockOnDone).toHaveBeenCalledWith(
        'Session color reset to default',
        { display: 'system' },
      )
    })
  })

  describe('队友限制', () => {
    it('队友不能设置颜色', async () => {
      vi.mocked(isTeammate).mockReturnValue(true)

      await call(mockOnDone, mockContext as any, 'red')

      expect(mockOnDone).toHaveBeenCalledWith(
        expect.stringContaining('Cannot set color'),
        { display: 'system' },
      )
    })
  })

  describe('AppState 更新', () => {
    it('设置颜色时应该更新 AppState', async () => {
      await call(mockOnDone, mockContext as any, 'red')

      expect(mockContext.setAppState).toHaveBeenCalled()
    })

    it('重置颜色时应该更新 AppState', async () => {
      await call(mockOnDone, mockContext as any, 'default')

      expect(mockContext.setAppState).toHaveBeenCalled()
    })
  })

  describe('返回值', () => {
    it('应该返回 null', async () => {
      const result = await call(mockOnDone, mockContext as any, 'red')

      expect(result).toBeNull()
    })
  })
})
