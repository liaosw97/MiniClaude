import { describe, it, expect } from 'vitest'
import { z } from 'zod/v4'
import { zodToJsonSchema } from '../../src/utils/zodToJsonSchema'

describe('zodToJsonSchema', () => {
  it('简单字符串 schema', () => {
    const schema = z.string()
    const result = zodToJsonSchema(schema)
    expect(result).toBeDefined()
    expect(result.type).toBe('string')
  })

  it('对象 schema', () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    const result = zodToJsonSchema(schema)
    expect(result.type).toBe('object')
    expect(result.properties).toBeDefined()
  })

  it('缓存命中 → 返回相同引用', () => {
    const schema = z.string()
    const result1 = zodToJsonSchema(schema)
    const result2 = zodToJsonSchema(schema)
    expect(result1).toBe(result2)
  })
})
