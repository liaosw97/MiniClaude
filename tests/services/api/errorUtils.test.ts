import { describe, it, expect } from 'vitest'
import {
  extractConnectionErrorDetails,
  getSSLErrorHint,
  formatAPIError,
} from '../../../src/services/api/errorUtils.js'
import type { APIError } from '@anthropic-ai/sdk'

function makeError(
  message: string,
  code?: string,
  cause?: unknown,
): Error & { code?: string; cause?: unknown } {
  const err = new Error(message) as Error & { code?: string; cause?: unknown }
  if (code) err.code = code
  if (cause !== undefined) err.cause = cause
  return err
}

function makeAPIError(
  message: string,
  status?: number,
  cause?: unknown,
): APIError {
  const err = new Error(message) as APIError
  ;(err as any).status = status
  if (cause !== undefined) (err as any).cause = cause
  return err
}

describe('extractConnectionErrorDetails', () => {
  it('返回 null 当 error 为 null', () => {
    expect(extractConnectionErrorDetails(null)).toBeNull()
  })

  it('返回 null 当 error 非对象', () => {
    expect(extractConnectionErrorDetails('string')).toBeNull()
  })

  it('提取带 code 的错误', () => {
    const err = makeError('timeout', 'ETIMEDOUT')
    const result = extractConnectionErrorDetails(err)
    expect(result).toEqual({
      code: 'ETIMEDOUT',
      message: 'timeout',
      isSSLError: false,
    })
  })

  it('识别 SSL 错误', () => {
    const err = makeError('ssl fail', 'DEPTH_ZERO_SELF_SIGNED_CERT')
    const result = extractConnectionErrorDetails(err)
    expect(result?.isSSLError).toBe(true)
  })

  it('遍历 cause 链', () => {
    const root = makeError('root', 'ETIMEDOUT')
    const mid = makeError('mid', undefined, root)
    const top = makeError('top', undefined, mid)
    const result = extractConnectionErrorDetails(top)
    expect(result?.code).toBe('ETIMEDOUT')
  })

  it('限制遍历深度为 5', () => {
    let current: any = makeError('deep', 'ETIMEDOUT')
    for (let i = 0; i < 10; i++) {
      current = makeError(`level-${i}`, undefined, current)
    }
    const result = extractConnectionErrorDetails(current)
    // Should still find it within 5 levels since ETIMEDOUT is at depth 10
    // But max depth is 5, so it won't find it
    expect(result).toBeNull()
  })

  it('返回 null 当无 code', () => {
    const err = makeError('no code')
    expect(extractConnectionErrorDetails(err)).toBeNull()
  })
})

describe('getSSLErrorHint', () => {
  it('返回 null 当非 SSL 错误', () => {
    const err = makeError('timeout', 'ETIMEDOUT')
    expect(getSSLErrorHint(err)).toBeNull()
  })

  it('返回提示当 SSL 错误', () => {
    const err = makeError('ssl', 'DEPTH_ZERO_SELF_SIGNED_CERT')
    const hint = getSSLErrorHint(err)
    expect(hint).toContain('SSL certificate error')
    expect(hint).toContain('NODE_EXTRA_CA_CERTS')
  })

  it('返回 null 当 error 为 null', () => {
    expect(getSSLErrorHint(null)).toBeNull()
  })
})

describe('formatAPIError', () => {
  it('格式化超时错误', () => {
    const err = makeAPIError('Connection error.', undefined, makeError('', 'ETIMEDOUT'))
    expect(formatAPIError(err)).toContain('timed out')
  })

  it('格式化 SSL 错误', () => {
    const err = makeAPIError('Connection error.', undefined, makeError('', 'CERT_HAS_EXPIRED'))
    expect(formatAPIError(err)).toContain('expired')
  })

  it('格式化自签名证书错误', () => {
    const err = makeAPIError('Connection error.', undefined, makeError('', 'DEPTH_ZERO_SELF_SIGNED_CERT'))
    expect(formatAPIError(err)).toContain('Self-signed')
  })

  it('格式化连接错误 (无 code)', () => {
    const err = makeAPIError('Connection error.')
    expect(formatAPIError(err)).toContain('internet connection')
  })

  it('格式化连接错误 (有非 SSL code)', () => {
    const err = makeAPIError('Connection error.', undefined, makeError('', 'ECONNREFUSED'))
    expect(formatAPIError(err)).toContain('ECONNREFUSED')
  })

  it('返回原始消息当非特殊错误', () => {
    const err = makeAPIError('Rate limited', 429)
    expect(formatAPIError(err)).toBe('Rate limited')
  })

  it('处理无 message 的 APIError', () => {
    const err = { status: 500 } as APIError
    expect(formatAPIError(err)).toContain('500')
  })

  it('处理嵌套错误 (Bedrock 格式)', () => {
    const err = { error: { message: 'Bedrock error' } } as unknown as APIError
    expect(formatAPIError(err)).toBe('Bedrock error')
  })

  it('处理嵌套错误 (标准 API 格式)', () => {
    const err = {
      error: { error: { message: 'Deep error' } },
    } as unknown as APIError
    expect(formatAPIError(err)).toBe('Deep error')
  })

  it('清理 HTML 内容', () => {
    const err = makeAPIError('<html><title>Bad Gateway</title><body>502</body></html>')
    expect(formatAPIError(err)).toBe('Bad Gateway')
  })
})
