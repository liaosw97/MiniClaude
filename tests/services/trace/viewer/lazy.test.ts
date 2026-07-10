import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildStubEntry,
  buildStubList,
  shouldUseLazyLoading,
  LAZY_THRESHOLD,
  clearCache,
  getStubs,
  getStubCount,
  getFullEntry,
  getCachedCount,
} from '../../../../src/services/trace/viewer/src/viewer/data/lazy.js'

describe('buildStubEntry', () => {
  it('从 JSONL 行构建 stub', () => {
    const line = JSON.stringify({
      request_id: 'req-1',
      turn: '1',
      timestamp: '2026-01-15T14:30:45Z',
      request: { method: 'POST', path: '/v1/messages', body: { model: 'claude-opus' } },
      response: { status: 200 },
      duration_ms: 1500,
      transport: 'stdio',
    })
    const stub = buildStubEntry(line, 0)
    expect(stub).not.toBeNull()
    expect(stub!.request_id).toBe('req-1')
    expect(stub!.model).toBe('claude-opus')
    expect(stub!.method).toBe('POST')
    expect(stub!.status).toBe(200)
    expect(stub!.duration_ms).toBe(1500)
    expect(stub!.lineIndex).toBe(0)
  })

  it('返回 null 当 JSON 无效', () => {
    expect(buildStubEntry('invalid json', 0)).toBeNull()
  })

  it('使用默认值当字段缺失', () => {
    const line = JSON.stringify({})
    const stub = buildStubEntry(line, 5)
    expect(stub).not.toBeNull()
    expect(stub!.request_id).toBe('line-5')
    expect(stub!.model).toBe('unknown')
    expect(stub!.method).toBe('POST')
    expect(stub!.status).toBe(0)
  })

  it('保留原始 JSONL 行', () => {
    const line = JSON.stringify({ request_id: 'test' })
    const stub = buildStubEntry(line, 0)
    expect(stub!.raw).toBe(line)
  })
})

describe('buildStubList', () => {
  beforeEach(() => {
    clearCache()
  })

  it('从 JSONL 内容构建 stub 列表', () => {
    const content = [
      JSON.stringify({ request_id: 'req-1', request: {}, response: {} }),
      JSON.stringify({ request_id: 'req-2', request: {}, response: {} }),
    ].join('\n')
    const stubs = buildStubList(content)
    expect(stubs).toHaveLength(2)
    expect(stubs[0].request_id).toBe('req-1')
    expect(stubs[1].request_id).toBe('req-2')
  })

  it('跳过空行', () => {
    const content = [
      JSON.stringify({ request_id: 'req-1' }),
      '',
      JSON.stringify({ request_id: 'req-2' }),
    ].join('\n')
    const stubs = buildStubList(content)
    expect(stubs).toHaveLength(2)
  })

  it('跳过无效 JSON 行', () => {
    const content = [
      JSON.stringify({ request_id: 'req-1' }),
      'invalid json',
      JSON.stringify({ request_id: 'req-2' }),
    ].join('\n')
    const stubs = buildStubList(content)
    expect(stubs).toHaveLength(2)
  })
})

describe('shouldUseLazyLoading', () => {
  it('返回 false 当数量 <= 阈值', () => {
    expect(shouldUseLazyLoading(50)).toBe(false)
    expect(shouldUseLazyLoading(0)).toBe(false)
  })

  it('返回 true 当数量 > 阈值', () => {
    expect(shouldUseLazyLoading(51)).toBe(true)
    expect(shouldUseLazyLoading(100)).toBe(true)
  })
})

describe('LAZY_THRESHOLD', () => {
  it('等于 50', () => {
    expect(LAZY_THRESHOLD).toBe(50)
  })
})

describe('懒加载状态管理', () => {
  beforeEach(() => {
    clearCache()
  })

  it('getStubs 返回空数组当无数据', () => {
    expect(getStubs()).toEqual([])
  })

  it('getStubCount 返回 0 当无数据', () => {
    expect(getStubCount()).toBe(0)
  })

  it('getCachedCount 返回 0 当无数据', () => {
    expect(getCachedCount()).toBe(0)
  })

  it('getFullEntry 返回 null 当无数据', () => {
    expect(getFullEntry('nonexistent')).toBeNull()
  })

  it('clearCache 清空所有状态', () => {
    const content = JSON.stringify({ request_id: 'req-1' })
    buildStubList(content)
    expect(getStubCount()).toBe(1)
    clearCache()
    expect(getStubCount()).toBe(0)
  })
})
