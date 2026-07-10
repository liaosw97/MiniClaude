import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { expandEnvVarsInString } from '../../../src/services/mcp/envExpansion.js'

describe('expandEnvVarsInString', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Scenario: MCP 配置环境变量展开
  it('展开已存在的环境变量', () => {
    process.env.API_KEY = 'test-key'
    const result = expandEnvVarsInString('${API_KEY}')
    expect(result.expanded).toBe('test-key')
    expect(result.missingVars).toEqual([])
  })

  it('展开多个环境变量', () => {
    process.env.HOST = 'localhost'
    process.env.PORT = '3000'
    const result = expandEnvVarsInString('http://${HOST}:${PORT}')
    expect(result.expanded).toBe('http://localhost:3000')
  })

  it('使用默认值当变量不存在', () => {
    delete process.env.MISSING
    const result = expandEnvVarsInString('${MISSING:-fallback}')
    expect(result.expanded).toBe('fallback')
    expect(result.missingVars).toEqual([])
  })

  it('优先使用环境变量而非默认值', () => {
    process.env.VAR = 'env-value'
    const result = expandEnvVarsInString('${VAR:-default}')
    expect(result.expanded).toBe('env-value')
  })

  it('记录缺失变量', () => {
    delete process.env.MISSING
    const result = expandEnvVarsInString('${MISSING}')
    expect(result.expanded).toBe('${MISSING}')
    expect(result.missingVars).toEqual(['MISSING'])
  })

  it('保留无变量的字符串', () => {
    const result = expandEnvVarsInString('plain text')
    expect(result.expanded).toBe('plain text')
    expect(result.missingVars).toEqual([])
  })

  it('处理空字符串', () => {
    const result = expandEnvVarsInString('')
    expect(result.expanded).toBe('')
    expect(result.missingVars).toEqual([])
  })

  it('处理空默认值', () => {
    delete process.env.VAR
    const result = expandEnvVarsInString('${VAR:-}')
    expect(result.expanded).toBe('')
  })

  it('处理含 :- 的默认值', () => {
    delete process.env.VAR
    const result = expandEnvVarsInString('${VAR:-http://localhost:3000}')
    expect(result.expanded).toBe('http://localhost:3000')
  })
})
