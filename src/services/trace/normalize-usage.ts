// src/services/trace/normalize-usage.ts

export interface NormalizedUsage {
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  cache_read_input_tokens: number | null
  cache_creation_input_tokens: number | null
}

/**
 * 将不同 provider 的 token 用量格式归一化为统一格式
 */
export function normalizeUsage(usage: Record<string, unknown>): NormalizedUsage | Record<string, unknown> | null {
  if (!usage) return null

  // Anthropic 格式: input_tokens, output_tokens, cache_read_input_tokens
  if ('input_tokens' in usage && 'output_tokens' in usage) {
    const u = usage as any
    return {
      input_tokens: u.input_tokens ?? null,
      output_tokens: u.output_tokens ?? null,
      total_tokens: (u.input_tokens ?? 0) + (u.output_tokens ?? 0) || null,
      cache_read_input_tokens: u.cache_read_input_tokens ?? null,
      cache_creation_input_tokens: u.cache_creation_input_tokens ?? null,
    }
  }

  // OpenAI 格式: prompt_tokens, completion_tokens, total_tokens
  if ('prompt_tokens' in usage || 'completion_tokens' in usage) {
    const u = usage as any
    return {
      input_tokens: u.prompt_tokens ?? null,
      output_tokens: u.completion_tokens ?? null,
      total_tokens: u.total_tokens ?? null,
      cache_read_input_tokens: null,
      cache_creation_input_tokens: null,
    }
  }

  // Gemini 格式: promptTokenCount, candidatesTokenCount, totalTokenCount
  if ('promptTokenCount' in usage || 'candidatesTokenCount' in usage) {
    const u = usage as any
    return {
      input_tokens: u.promptTokenCount ?? null,
      output_tokens: u.candidatesTokenCount ?? null,
      total_tokens: u.totalTokenCount ?? null,
      cache_read_input_tokens: u.cachedContentTokenCount ?? null,
      cache_creation_input_tokens: null,
    }
  }

  // 未知格式，返回原始数据
  console.warn(`[trace] Unknown usage format: ${JSON.stringify(usage)}`)
  return usage
}