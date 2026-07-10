import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockColorize = vi.fn((text: string, color: string, type: string) => `[${type}:${color}]${text}`)
const mockGetTheme = vi.fn((themeName: string) => ({
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
}))

vi.mock('../../../src/ink/colorize.js', () => ({
  colorize: mockColorize,
}))

vi.mock('../../../src/utils/theme.js', () => ({
  getTheme: mockGetTheme,
}))

// Import after mocks
const { color } = await import('../../../src/components/design-system/color.js')

describe('color 函数', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本功能', () => {
    it('应该返回一个函数', () => {
      const result = color('primary', 'dark')
      expect(typeof result).toBe('function')
    })

    it('当颜色为 undefined 时应该返回原样文本', () => {
      const colorFn = color(undefined, 'dark')
      const result = colorFn('hello')
      expect(result).toBe('hello')
    })
  })

  describe('原始颜色值', () => {
    it('应该处理 rgb 颜色', () => {
      const colorFn = color('rgb(255,0,0)', 'dark')
      const result = colorFn('hello')

      expect(mockColorize).toHaveBeenCalledWith('hello', 'rgb(255,0,0)', 'foreground')
      expect(result).toBe('[foreground:rgb(255,0,0)]hello')
    })

    it('应该处理 hex 颜色', () => {
      const colorFn = color('#ff0000', 'dark')
      const result = colorFn('hello')

      expect(mockColorize).toHaveBeenCalledWith('hello', '#ff0000', 'foreground')
      expect(result).toBe('[foreground:#ff0000]hello')
    })

    it('应该处理 ansi256 颜色', () => {
      const colorFn = color('ansi256(196)', 'dark')
      const result = colorFn('hello')

      expect(mockColorize).toHaveBeenCalledWith('hello', 'ansi256(196)', 'foreground')
      expect(result).toBe('[foreground:ansi256(196)]hello')
    })

    it('应该处理 ansi 颜色', () => {
      const colorFn = color('ansi:31', 'dark')
      const result = colorFn('hello')

      expect(mockColorize).toHaveBeenCalledWith('hello', 'ansi:31', 'foreground')
      expect(result).toBe('[foreground:ansi:31]hello')
    })
  })

  describe('主题颜色', () => {
    it('应该查找主题颜色', () => {
      const colorFn = color('primary', 'dark')
      const result = colorFn('hello')

      expect(mockGetTheme).toHaveBeenCalledWith('dark')
      expect(mockColorize).toHaveBeenCalledWith('hello', '#007bff', 'foreground')
      expect(result).toBe('[foreground:#007bff]hello')
    })

    it('应该支持不同的主题', () => {
      const colorFn = color('primary', 'light')
      colorFn('hello')

      expect(mockGetTheme).toHaveBeenCalledWith('light')
    })
  })

  describe('颜色类型', () => {
    it('应该支持 foreground 类型', () => {
      const colorFn = color('primary', 'dark', 'foreground')
      colorFn('hello')

      expect(mockColorize).toHaveBeenCalledWith('hello', '#007bff', 'foreground')
    })

    it('应该支持 background 类型', () => {
      const colorFn = color('primary', 'dark', 'background')
      colorFn('hello')

      expect(mockColorize).toHaveBeenCalledWith('hello', '#007bff', 'background')
    })

    it('默认应该是 foreground 类型', () => {
      const colorFn = color('primary', 'dark')
      colorFn('hello')

      expect(mockColorize).toHaveBeenCalledWith('hello', '#007bff', 'foreground')
    })
  })

  describe('返回的函数', () => {
    it('应该正确处理文本', () => {
      const colorFn = color('primary', 'dark')
      const result = colorFn('test text')

      expect(result).toContain('test text')
    })

    it('应该处理空字符串', () => {
      const colorFn = color('primary', 'dark')
      const result = colorFn('')

      expect(result).toBeDefined()
    })
  })
})
