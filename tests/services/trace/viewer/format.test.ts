import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fmtDuration,
  fmtChars,
  fmtNumber,
  fmtTime,
  fmtDate,
  fmtRelativeTime,
  fmtTokens,
  fmtTableTime,
} from '../../../../src/services/trace/viewer/src/shared/format.js'

describe('fmtDuration', () => {
  it('格式化毫秒', () => {
    expect(fmtDuration(500)).toBe('500ms')
    expect(fmtDuration(0)).toBe('0ms')
  })

  it('格式化秒', () => {
    expect(fmtDuration(1500)).toBe('1.5s')
    expect(fmtDuration(59999)).toBe('60.0s')
  })

  it('格式化分钟', () => {
    expect(fmtDuration(60000)).toBe('1m 0s')
    expect(fmtDuration(90000)).toBe('1m 30s')
    expect(fmtDuration(125000)).toBe('2m 5s')
  })
})

describe('fmtChars', () => {
  it('格式化小于 1000', () => {
    expect(fmtChars(0)).toBe('0')
    expect(fmtChars(999)).toBe('999')
  })

  it('格式化千', () => {
    expect(fmtChars(1000)).toBe('1.0k')
    expect(fmtChars(1500)).toBe('1.5k')
    expect(fmtChars(999999)).toBe('1000.0k')
  })

  it('格式化百万', () => {
    expect(fmtChars(1000000)).toBe('1.0M')
    expect(fmtChars(2500000)).toBe('2.5M')
  })
})

describe('fmtNumber', () => {
  it('格式化带千分位', () => {
    expect(fmtNumber(1000)).toMatch(/1.?000/)
    expect(fmtNumber(0)).toBe('0')
  })
})

describe('fmtTime', () => {
  it('格式化 ISO 时间', () => {
    const result = fmtTime('2026-01-15T14:30:45Z')
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/)
  })
})

describe('fmtDate', () => {
  it('格式化 ISO 日期', () => {
    const result = fmtDate('2026-01-15T14:30:45Z')
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('fmtRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('返回 just now 当小于 1 分钟', () => {
    vi.setSystemTime(new Date('2026-01-15T14:30:45Z'))
    expect(fmtRelativeTime('2026-01-15T14:30:00Z')).toBe('just now')
  })

  it('返回分钟当小于 1 小时', () => {
    vi.setSystemTime(new Date('2026-01-15T14:30:45Z'))
    expect(fmtRelativeTime('2026-01-15T14:25:45Z')).toBe('5m ago')
  })

  it('返回小时当小于 1 天', () => {
    vi.setSystemTime(new Date('2026-01-15T14:30:45Z'))
    expect(fmtRelativeTime('2026-01-15T11:30:45Z')).toBe('3h ago')
  })

  it('返回天当大于 1 天', () => {
    vi.setSystemTime(new Date('2026-01-15T14:30:45Z'))
    expect(fmtRelativeTime('2026-01-12T14:30:45Z')).toBe('3d ago')
  })
})

describe('fmtTokens', () => {
  it('格式化小于 1000', () => {
    expect(fmtTokens(500)).toBe('500')
  })

  it('格式化千', () => {
    expect(fmtTokens(1500)).toBe('1.5k')
  })

  it('格式化百万', () => {
    expect(fmtTokens(1500000)).toBe('1.50M')
  })
})

describe('fmtTableTime', () => {
  it('格式化表格时间', () => {
    const result = fmtTableTime('2026-01-15T14:30:45Z')
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
  })
})
