import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Markdown 组件内部逻辑的本地副本
 * 从 src/components/Markdown.tsx 提取
 * 测试 hasMarkdownSyntax 和 cachedLexer 的核心逻辑
 */

// hasMarkdownSyntax 函数 - 检测文本是否包含 markdown 语法
const MD_SYNTAX_RE = /[#*`|[>\-_~]|\n\n|^\d+\. |\n\d+\. /
function hasMarkdownSyntax(s: string): boolean {
  return MD_SYNTAX_RE.test(s.length > 500 ? s.slice(0, 500) : s)
}

// cachedLexer 的核心逻辑 - 无 markdown 语法时返回单段落 token
function createPlainTextToken(content: string) {
  return [{
    type: 'paragraph',
    raw: content,
    text: content,
    tokens: [{
      type: 'text',
      raw: content,
      text: content,
    }],
  }]
}

describe('Markdown 组件逻辑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasMarkdownSyntax', () => {
    describe('应该检测到 markdown 语法', () => {
      it('当包含 # 标题时应该返回 true', () => {
        expect(hasMarkdownSyntax('# Hello World')).toBe(true)
      })

      it('当包含 * 加粗时应该返回 true', () => {
        expect(hasMarkdownSyntax('Hello **World**')).toBe(true)
      })

      it('当包含 ` 代码时应该返回 true', () => {
        expect(hasMarkdownSyntax('Use `console.log`')).toBe(true)
      })

      it('当包含 > 引用时应该返回 true', () => {
        expect(hasMarkdownSyntax('> This is a quote')).toBe(true)
      })

      it('当包含 - 列表时应该返回 true', () => {
        expect(hasMarkdownSyntax('- Item 1')).toBe(true)
      })

      it('当包含 ~ 删除线时应该返回 true', () => {
        expect(hasMarkdownSyntax('~deleted~')).toBe(true)
      })

      it('当包含 _ 斜体时应该返回 true', () => {
        expect(hasMarkdownSyntax('Hello _World_')).toBe(true)
      })

      it('当包含双换行时应该返回 true', () => {
        expect(hasMarkdownSyntax('Hello\n\nWorld')).toBe(true)
      })

      it('当包含有序列表时应该返回 true', () => {
        expect(hasMarkdownSyntax('1. First item')).toBe(true)
      })

      it('当包含 [ 链接时应该返回 true', () => {
        expect(hasMarkdownSyntax('[link](http://example.com)')).toBe(true)
      })

      it('当包含 | 表格时应该返回 true', () => {
        expect(hasMarkdownSyntax('| Header |')).toBe(true)
      })
    })

    describe('不应该误判纯文本', () => {
      it('当为简单文本时应该返回 false', () => {
        expect(hasMarkdownSyntax('Hello World')).toBe(false)
      })

      it('当包含数字但非列表时应该返回 false', () => {
        expect(hasMarkdownSyntax('I have 100 items')).toBe(false)
      })

      it('当为空字符串时应该返回 false', () => {
        expect(hasMarkdownSyntax('')).toBe(false)
      })

      it('当为普通句子时应该返回 false', () => {
        expect(hasMarkdownSyntax('This is a normal sentence with punctuation.')).toBe(false)
      })

      it('当包含逗号分隔的数字时应该返回 false', () => {
        expect(hasMarkdownSyntax('Price is 10, 20, 30 dollars')).toBe(false)
      })
    })

    describe('长文本采样', () => {
      it('当文本超过 500 字符时只检查前 500 字符', () => {
        const longText = 'a'.repeat(600) + '# Header'
        // 因为只检查前 500 字符，所以不会检测到末尾的 markdown
        expect(hasMarkdownSyntax(longText)).toBe(false)
      })

      it('当 markdown 在前 500 字符内时应该检测到', () => {
        const longText = '# Header\n' + 'a'.repeat(600)
        expect(hasMarkdownSyntax(longText)).toBe(true)
      })
    })
  })

  describe('createPlainTextToken', () => {
    it('应该返回正确的 token 结构', () => {
      const result = createPlainTextToken('Hello World')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('paragraph')
      expect(result[0].raw).toBe('Hello World')
      expect(result[0].text).toBe('Hello World')
    })

    it('应该包含子 tokens', () => {
      const result = createPlainTextToken('Hello World')
      expect(result[0].tokens).toHaveLength(1)
      expect(result[0].tokens[0].type).toBe('text')
      expect(result[0].tokens[0].raw).toBe('Hello World')
      expect(result[0].tokens[0].text).toBe('Hello World')
    })

    it('应该正确处理空字符串', () => {
      const result = createPlainTextToken('')
      expect(result[0].raw).toBe('')
      expect(result[0].text).toBe('')
    })

    it('应该正确处理特殊字符', () => {
      const specialText = 'Hello <World> & "Friends"'
      const result = createPlainTextToken(specialText)
      expect(result[0].text).toBe(specialText)
    })
  })

  describe('条件渲染逻辑', () => {
    describe('shouldShowTimestamp 条件', () => {
      // 模拟 MessageTimestamp 组件的条件逻辑
      function shouldShowTimestamp(
        isTranscriptMode: boolean,
        timestamp: string | undefined,
        messageType: string,
        content: Array<{ type: string }>
      ): boolean {
        return (
          isTranscriptMode &&
          !!timestamp &&
          messageType === 'assistant' &&
          content.some(c => c.type === 'text')
        )
      }

      it('当所有条件满足时应该返回 true', () => {
        expect(shouldShowTimestamp(
          true,
          '2024-01-01T00:00:00Z',
          'assistant',
          [{ type: 'text' }]
        )).toBe(true)
      })

      it('当 isTranscriptMode 为 false 时应该返回 false', () => {
        expect(shouldShowTimestamp(
          false,
          '2024-01-01T00:00:00Z',
          'assistant',
          [{ type: 'text' }]
        )).toBe(false)
      })

      it('当 timestamp 为空时应该返回 false', () => {
        expect(shouldShowTimestamp(
          true,
          undefined,
          'assistant',
          [{ type: 'text' }]
        )).toBe(false)
      })

      it('当 messageType 不是 assistant 时应该返回 false', () => {
        expect(shouldShowTimestamp(
          true,
          '2024-01-01T00:00:00Z',
          'user',
          [{ type: 'text' }]
        )).toBe(false)
      })

      it('当 content 没有 text 类型时应该返回 false', () => {
        expect(shouldShowTimestamp(
          true,
          '2024-01-01T00:00:00Z',
          'assistant',
          [{ type: 'image' }]
        )).toBe(false)
      })
    })

    describe('TokenWarning 条件渲染逻辑', () => {
      // 模拟 TokenWarning 组件的条件逻辑
      function getWarningDisplay(
        percentLeft: number,
        isAboveWarningThreshold: boolean,
        isAboveErrorThreshold: boolean,
        suppressWarning: boolean
      ): { show: boolean; color: string; message: string } | null {
        if (!isAboveWarningThreshold || suppressWarning) {
          return null
        }

        const color = isAboveErrorThreshold ? 'error' : 'warning'
        const message = `Context low (${percentLeft}% remaining) · Run /compact to compact & continue`

        return { show: true, color, message }
      }

      it('当低于警告阈值时应该返回 null', () => {
        expect(getWarningDisplay(80, false, false, false)).toBeNull()
      })

      it('当警告被抑制时应该返回 null', () => {
        expect(getWarningDisplay(10, true, true, true)).toBeNull()
      })

      it('当超过警告阈值时应该显示警告', () => {
        const result = getWarningDisplay(15, true, false, false)
        expect(result).not.toBeNull()
        expect(result?.show).toBe(true)
        expect(result?.color).toBe('warning')
      })

      it('当超过错误阈值时应该显示错误颜色', () => {
        const result = getWarningDisplay(5, true, true, false)
        expect(result).not.toBeNull()
        expect(result?.color).toBe('error')
      })

      it('消息应该包含剩余百分比', () => {
        const result = getWarningDisplay(12, true, false, false)
        expect(result?.message).toContain('12%')
      })
    })
  })
})
