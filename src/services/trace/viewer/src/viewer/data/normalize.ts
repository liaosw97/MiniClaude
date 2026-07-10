/**
 * 数据规范化层 — 多 API 格式适配
 *
 * 将不同 API 提供商的请求/响应格式统一为 viewer 内部使用的 TraceEntry 格式。
 * 支持 Anthropic API、OpenAI 兼容格式等。
 */

import type {
  ApiRequestBody,
  ApiResponse,
  Message,
  ContentBlock,
  SystemBlock,
  ToolDefinition,
  Usage,
} from '../../shared/types'

// ─── 请求体规范化 ─────────────────────────────────────────────────────────────

/**
 * 提取 messages 数组
 * 兼容 Anthropic (messages) 和 OpenAI (messages) 格式
 */
export function getMessages(request: ApiRequestBody | null | undefined): Message[] {
  if (!request) return []
  return request.messages ?? []
}

/**
 * 提取 system prompt
 * Anthropic: system 字段（string 或 SystemBlock[]）
 * OpenAI: messages 中 role=system 的消息
 */
export function extractSystem(request: ApiRequestBody | null | undefined): string | SystemBlock[] {
  if (!request) return ''

  // Anthropic 格式
  if (request.system !== undefined) {
    return request.system
  }

  // OpenAI 格式：从 messages 中提取 system 消息
  const systemMessages = (request.messages ?? []).filter(m => m.role === 'system')
  if (systemMessages.length > 0) {
    return systemMessages
      .map(m => typeof m.content === 'string' ? m.content : '')
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

/**
 * 提取工具定义
 * 兼容 Anthropic (tools) 和 OpenAI (tools) 格式
 */
export function getRequestTools(request: ApiRequestBody | null | undefined): ToolDefinition[] {
  if (!request) return []
  return request.tools ?? []
}

/**
 * 提取 model 名称
 */
export function getModel(request: ApiRequestBody | null | undefined): string {
  if (!request) return 'unknown'
  return request.model ?? 'unknown'
}

/**
 * 提取 max_tokens
 */
export function getMaxTokens(request: ApiRequestBody | null | undefined): number | undefined {
  if (!request) return undefined
  return request.max_tokens
}

/**
 * 提取 stream 标志
 */
export function isStreaming(request: ApiRequestBody | null | undefined): boolean {
  if (!request) return false
  return request.stream ?? false
}

// ─── 响应体规范化 ─────────────────────────────────────────────────────────────

/**
 * 提取 usage 统计
 * Anthropic: usage 字段
 * OpenAI: usage 字段
 */
export function getUsage(response: ApiResponse | null | undefined): Usage | undefined {
  if (!response) return undefined
  return response.usage
}

/**
 * 提取响应输出内容块
 * Anthropic: content 数组
 * OpenAI: choices[0].message.content
 */
export function getResponseOutput(response: ApiResponse | null | undefined): ContentBlock[] {
  if (!response) return []

  // Anthropic 格式
  if (response.content && Array.isArray(response.content)) {
    return response.content
  }

  // OpenAI 格式（通过 choices）
  const choices = (response as any).choices
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0].message
    if (message) {
      if (typeof message.content === 'string') {
        return [{ type: 'text', text: message.content }]
      }
      if (Array.isArray(message.content)) {
        return message.content
      }
    }
  }

  return []
}

/**
 * 提取响应 ID
 */
export function getResponseId(response: ApiResponse | null | undefined): string {
  if (!response) return ''
  return response.id ?? ''
}

/**
 * 提取响应角色
 */
export function getResponseRole(response: ApiResponse | null | undefined): string {
  if (!response) return 'assistant'
  return response.role ?? 'assistant'
}

/**
 * 检查响应是否包含错误
 */
export function hasError(response: ApiResponse | null | undefined): boolean {
  if (!response) return false
  return !!response.error
}

/**
 * 提取错误信息
 */
export function getError(response: ApiResponse | null | undefined): { type: string; message: string; code?: string } | null {
  if (!response?.error) return null
  return {
    type: response.error.type,
    message: response.error.message,
    code: response.error.code,
  }
}

// ─── 内容块工具 ───────────────────────────────────────────────────────────────

/**
 * 从内容块数组中提取纯文本
 */
export function extractText(blocks: ContentBlock[]): string {
  return blocks
    .filter(b => b.type === 'text' && b.text)
    .map(b => b.text!)
    .join('\n')
}

/**
 * 从内容块数组中提取工具调用
 */
export function extractToolUses(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter(b => b.type === 'tool_use')
}

/**
 * 从内容块数组中提取工具结果
 */
export function extractToolResults(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter(b => b.type === 'tool_result')
}

/**
 * 从内容块数组中提取 thinking 块
 */
export function extractThinking(blocks: ContentBlock[]): string {
  return blocks
    .filter(b => b.type === 'thinking' && b.thinking)
    .map(b => b.thinking!)
    .join('\n')
}

/**
 * 检查内容块是否包含图片
 */
export function hasImages(blocks: ContentBlock[]): boolean {
  return blocks.some(b => b.type === 'image')
}

/**
 * 计算内容块总字符数
 */
export function countChars(blocks: ContentBlock[]): number {
  return blocks.reduce((sum, b) => {
    if (b.type === 'text' && b.text) return sum + b.text.length
    if (b.type === 'thinking' && b.thinking) return sum + b.thinking.length
    if (b.type === 'tool_result' && typeof b.content === 'string') return sum + b.content.length
    return sum
  }, 0)
}
