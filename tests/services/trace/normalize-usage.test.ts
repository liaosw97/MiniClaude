import { describe, it, expect, vi } from 'vitest'
import { normalizeUsage } from '../../../src/services/trace/normalize-usage.js'

describe('normalize-usage', () => {
  it('should normalize Anthropic format', () => {
    const result = normalizeUsage({ input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 5 })
    expect(result).toEqual({ input_tokens: 10, output_tokens: 20, total_tokens: 30, cache_read_input_tokens: 5, cache_creation_input_tokens: null })
  })

  it('should normalize OpenAI format', () => {
    const result = normalizeUsage({ prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 })
    expect(result).toEqual({ input_tokens: 10, output_tokens: 20, total_tokens: 30, cache_read_input_tokens: null, cache_creation_input_tokens: null })
  })

  it('should normalize Gemini format', () => {
    const result = normalizeUsage({ promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30, cachedContentTokenCount: 5 })
    expect(result).toEqual({ input_tokens: 10, output_tokens: 20, total_tokens: 30, cache_read_input_tokens: 5, cache_creation_input_tokens: null })
  })

  it('should return raw data for unknown format with warning log', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = { unknown: 'format' }
    const result = normalizeUsage(raw)
    expect(result).toEqual(raw)
    expect(warnSpy).toHaveBeenCalledWith('[trace] Unknown usage format: {"unknown":"format"}')
    warnSpy.mockRestore()
  })

  it('should handle missing usage field', () => {
    const result = normalizeUsage(undefined as any)
    expect(result).toBeNull()
  })

  it('should handle null cache fields', () => {
    const result = normalizeUsage({ input_tokens: 10, output_tokens: 20 })
    expect(result.cache_read_input_tokens).toBeNull()
    expect(result.cache_creation_input_tokens).toBeNull()
  })
})