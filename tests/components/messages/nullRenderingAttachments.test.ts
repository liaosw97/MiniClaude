import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import after mocks
const { isNullRenderingAttachment } = await import('../../../src/components/messages/nullRenderingAttachments.js')

describe('nullRenderingAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isNullRenderingAttachment', () => {
    it('当消息是 attachment 类型且是 null rendering 类型时应该返回 true', () => {
      const msg = {
        type: 'attachment',
        attachment: {
          type: 'hook_success',
        },
      }

      expect(isNullRenderingAttachment(msg as any)).toBe(true)
    })

    it('当消息是 attachment 类型但不是 null rendering 类型时应该返回 false', () => {
      const msg = {
        type: 'attachment',
        attachment: {
          type: 'some_other_type',
        },
      }

      expect(isNullRenderingAttachment(msg as any)).toBe(false)
    })

    it('当消息不是 attachment 类型时应该返回 false', () => {
      const msg = {
        type: 'user',
        message: { content: 'hello' },
      }

      expect(isNullRenderingAttachment(msg as any)).toBe(false)
    })

    it('应该支持所有 null rendering 类型', () => {
      const nullRenderingTypes = [
        'hook_success',
        'hook_additional_context',
        'hook_cancelled',
        'command_permissions',
        'agent_mention',
        'budget_usd',
        'critical_system_reminder',
        'edited_image_file',
        'edited_text_file',
        'opened_file_in_ide',
        'output_style',
        'plan_mode',
        'plan_mode_exit',
        'plan_mode_reentry',
        'structured_output',
        'team_context',
        'todo_reminder',
        'context_efficiency',
        'deferred_tools_delta',
        'mcp_instructions_delta',
        'companion_intro',
        'token_usage',
        'ultrathink_effort',
        'max_turns_reached',
        'task_reminder',
        'auto_mode',
        'auto_mode_exit',
        'output_token_usage',
        'pen_mode_enter',
        'pen_mode_exit',
        'verify_plan_reminder',
        'current_session_memory',
        'compaction_reminder',
        'date_change',
      ]

      for (const type of nullRenderingTypes) {
        const msg = {
          type: 'attachment',
          attachment: { type },
        }
        expect(isNullRenderingAttachment(msg as any)).toBe(true)
      }
    })

    it('应该拒绝非 null rendering 类型', () => {
      const nonNullTypes = [
        'image',
        'file',
        'code',
        'link',
        'other',
      ]

      for (const type of nonNullTypes) {
        const msg = {
          type: 'attachment',
          attachment: { type },
        }
        expect(isNullRenderingAttachment(msg as any)).toBe(false)
      }
    })
  })
})
