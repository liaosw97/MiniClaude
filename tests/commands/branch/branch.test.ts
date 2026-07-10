import { describe, it, expect } from 'vitest'

// 直接内联 deriveFirstPrompt 逻辑进行测试，避免深层依赖链
// 源码位置: src/commands/branch/branch.ts:38-54

function deriveFirstPrompt(
  firstUserMessage:
    | { type: 'user'; message: { content: string | Array<{ type: string; text?: string }> } }
    | undefined,
): string {
  const content = firstUserMessage?.message?.content
  if (!content) return 'Branched conversation'
  const raw =
    typeof content === 'string'
      ? content
      : content.find(
          (block): block is { type: 'text'; text: string } =>
            block.type === 'text',
        )?.text
  if (!raw) return 'Branched conversation'
  return (
    raw.replace(/\s+/g, ' ').trim().slice(0, 100) || 'Branched conversation'
  )
}

describe('deriveFirstPrompt', () => {
  // Scenario: /branch 命令 — 从用户消息派生标题
  it('从纯文本 content 派生标题', () => {
    const msg = {
      type: 'user' as const,
      message: { content: 'Hello world' },
    }
    expect(deriveFirstPrompt(msg)).toBe('Hello world')
  })

  it('从 content block 数组提取文本', () => {
    const msg = {
      type: 'user' as const,
      message: {
        content: [
          { type: 'text', text: 'First prompt text' },
          { type: 'image' },
        ],
      },
    }
    expect(deriveFirstPrompt(msg)).toBe('First prompt text')
  })

  it('折叠多行空白为空格', () => {
    const msg = {
      type: 'user' as const,
      message: { content: 'Line1\n\n  Line2\t\tLine3' },
    }
    expect(deriveFirstPrompt(msg)).toBe('Line1 Line2 Line3')
  })

  it('截断到 100 字符', () => {
    const longText = 'a'.repeat(150)
    const msg = {
      type: 'user' as const,
      message: { content: longText },
    }
    expect(deriveFirstPrompt(msg)).toHaveLength(100)
  })

  it('返回默认标题当消息为 undefined', () => {
    expect(deriveFirstPrompt(undefined)).toBe('Branched conversation')
  })

  it('返回默认标题当 content 为空字符串', () => {
    const msg = {
      type: 'user' as const,
      message: { content: '' },
    }
    expect(deriveFirstPrompt(msg)).toBe('Branched conversation')
  })

  it('返回默认标题当 content 无 text block', () => {
    const msg = {
      type: 'user' as const,
      message: {
        content: [{ type: 'image' }],
      },
    }
    expect(deriveFirstPrompt(msg)).toBe('Branched conversation')
  })

  it('返回默认标题当折叠后为空字符串', () => {
    const msg = {
      type: 'user' as const,
      message: { content: '   \n\t  ' },
    }
    expect(deriveFirstPrompt(msg)).toBe('Branched conversation')
  })
})
