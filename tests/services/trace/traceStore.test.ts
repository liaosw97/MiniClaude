import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `trace-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true })
  }
})

describe('getTracesDir', () => {
  it('should return traces directory path', async () => {
    const { getTracesDir } = await import('../../../src/services/trace/traceStore')
    const result = getTracesDir(testDir)
    expect(result).toBe(join(testDir, 'traces'))
  })
})

describe('getTraceFilePath', () => {
  it('should return trace file path with date', async () => {
    const { getTraceFilePath } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-session-123'
    const date = '2026-05-29'
    const result = getTraceFilePath(sessionId, date, testDir)
    expect(result).toBe(join(testDir, 'traces', date, `${sessionId}.jsonl`))
  })

  it('should use today date when date not provided', async () => {
    const { getTraceFilePath } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-session-123'
    const result = getTraceFilePath(sessionId, undefined, testDir)
    const today = new Date().toISOString().split('T')[0]
    expect(result).toBe(join(testDir, 'traces', today, `${sessionId}.jsonl`))
  })
})

describe('getIndexPath', () => {
  it('should return index.json path', async () => {
    const { getIndexPath } = await import('../../../src/services/trace/traceStore')
    const result = getIndexPath(testDir)
    expect(result).toBe(join(testDir, 'traces', 'index.json'))
  })
})

describe('appendTraceRecord', () => {
  it('should create JSONL file and append record', async () => {
    const { appendTraceRecord, getTraceFilePath } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-session-123'
    const date = '2026-05-29'
    const record = { type: 'request', timestamp: '2026-05-29T10:00:00Z', data: { body: { test: true } } }

    await appendTraceRecord(sessionId, record, date, testDir)
    await new Promise(r => setTimeout(r, 100))

    const filePath = getTraceFilePath(sessionId, date, testDir)
    expect(existsSync(filePath)).toBe(true)

    const content = require('fs').readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0])).toEqual(record)
  })

  it('should append multiple records as separate lines', async () => {
    const { appendTraceRecord, getTraceFilePath } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-session-456'
    const date = '2026-05-29'
    const record1 = { type: 'request', timestamp: '2026-05-29T10:00:00Z', data: {} }
    const record2 = { type: 'response', timestamp: '2026-05-29T10:00:01Z', data: {} }

    await appendTraceRecord(sessionId, record1, date, testDir)
    await appendTraceRecord(sessionId, record2, date, testDir)
    await new Promise(r => setTimeout(r, 100))

    const filePath = getTraceFilePath(sessionId, date, testDir)
    const content = require('fs').readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines).toHaveLength(2)
  })

  it('should not throw on write failure and log warning', async () => {
    const { appendTraceRecord } = await import('../../../src/services/trace/traceStore')
    const readonlyDir = '/nonexistent/path'
    const sessionId = 'test-session'
    const record = { type: 'request', timestamp: '2026-05-29T10:00:00Z', data: {} }

    await expect(appendTraceRecord(sessionId, record, '2026-05-29', readonlyDir)).resolves.toBeUndefined()
  })
})

describe('createSessionEntry', () => {
  it('should create index.json with session entry', async () => {
    const { createSessionEntry, getIndexPath } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-session-123'
    const model = 'claude-3-opus'

    await createSessionEntry(sessionId, model, testDir)
    await new Promise(r => setTimeout(r, 100))

    const indexPath = getIndexPath(testDir)
    expect(existsSync(indexPath)).toBe(true)

    const content = require('fs').readFileSync(indexPath, 'utf-8')
    const index = JSON.parse(content)
    expect(index.sessions).toHaveLength(1)
    expect(index.sessions[0].id).toBe(sessionId)
    expect(index.sessions[0].model).toBe(model)
    expect(index.sessions[0].startedAt).toBeDefined()
  })

  it('should prepend new session to existing sessions', async () => {
    const { createSessionEntry, readIndex } = await import('../../../src/services/trace/traceStore')

    await createSessionEntry('session-1', 'claude-3-opus', testDir)
    await createSessionEntry('session-2', 'claude-3-sonnet', testDir)
    await new Promise(r => setTimeout(r, 100))

    const index = await readIndex(testDir)
    expect(index.sessions).toHaveLength(2)
    expect(index.sessions[0].id).toBe('session-2')
    expect(index.sessions[1].id).toBe('session-1')
  })
})

describe('updateSessionEntry', () => {
  it('should update session entry with new data', async () => {
    const { createSessionEntry, updateSessionEntry, readIndex } = await import('../../../src/services/trace/traceStore')

    await createSessionEntry('session-1', 'claude-3-opus', testDir)
    await updateSessionEntry('session-1', {
      turns: 3,
      totalInputTokens: 500,
      totalOutputTokens: 200
    }, testDir)
    await new Promise(r => setTimeout(r, 100))

    const index = await readIndex(testDir)
    const session = index.sessions.find((s: any) => s.id === 'session-1')
    expect(session).toBeDefined()
    expect(session!.turns).toBe(3)
    expect(session!.totalInputTokens).toBe(500)
    expect(session!.totalOutputTokens).toBe(200)
    expect(session!.lastActivity).toBeDefined()
  })

  it('should silently ignore non-existent session', async () => {
    const { updateSessionEntry } = await import('../../../src/services/trace/traceStore')
    await expect(updateSessionEntry('non-existent', { turns: 1 }, testDir)).resolves.toBeUndefined()
  })
})

describe('readIndex', () => {
  it('should return empty index when file does not exist', async () => {
    const { readIndex } = await import('../../../src/services/trace/traceStore')
    const index = await readIndex(testDir)
    expect(index).toEqual({ sessions: [] })
  })

  it('should read existing index file', async () => {
    const { createSessionEntry, readIndex } = await import('../../../src/services/trace/traceStore')

    await createSessionEntry('session-1', 'claude-3-opus', testDir)
    await new Promise(r => setTimeout(r, 100))

    const index = await readIndex(testDir)
    expect(index.sessions).toHaveLength(1)
    expect(index.sessions[0].id).toBe('session-1')
  })

  it('should return empty index when file is corrupted', async () => {
    const { readIndex, getIndexPath } = await import('../../../src/services/trace/traceStore')
    const { writeFileSync, mkdirSync } = require('fs')

    const indexPath = getIndexPath(testDir)
    const dir = indexPath.substring(0, indexPath.lastIndexOf(require('path').sep))
    mkdirSync(dir, { recursive: true })
    writeFileSync(indexPath, 'invalid json content')

    const index = await readIndex(testDir)
    expect(index).toEqual({ sessions: [] })
  })

  it('should handle index.json write failure gracefully', async () => {
    const { writeIndex } = await import('../../../src/services/trace/traceStore')
    const index = { sessions: [] }

    // 使用不存在的目录模拟写入失败
    const readonlyDir = '/nonexistent/path'

    // 不应抛出异常
    await expect(writeIndex(index, readonlyDir)).resolves.toBeUndefined()
  })
})

describe('listSessions', () => {
  it('should return empty array when no sessions', async () => {
    const { listSessions } = await import('../../../src/services/trace/traceStore')
    const sessions = await listSessions(testDir)
    expect(sessions).toEqual([])
  })

  it('should return sessions sorted by lastActivity descending', async () => {
    const { createSessionEntry, updateSessionEntry, listSessions } = await import('../../../src/services/trace/traceStore')

    await createSessionEntry('session-1', 'claude-3-opus', testDir)
    await new Promise(r => setTimeout(r, 50)) // 确保时间戳不同
    await createSessionEntry('session-2', 'claude-3-sonnet', testDir)
    await new Promise(r => setTimeout(r, 50))
    await updateSessionEntry('session-1', { turns: 1 }, testDir)
    await new Promise(r => setTimeout(r, 100))

    const sessions = await listSessions(testDir)
    expect(sessions).toHaveLength(2)
    expect(sessions[0].id).toBe('session-1')
    expect(sessions[1].id).toBe('session-2')
  })
})

describe('getSessionTrace', () => {
  it('should return empty array for non-existent session', async () => {
    const { getSessionTrace } = await import('../../../src/services/trace/traceStore')
    const records = await getSessionTrace('non-existent', testDir)
    expect(records).toEqual([])
  })

  it('should return all trace records for a session', async () => {
    const { createSessionEntry, appendTraceRecord, getSessionTrace } = await import('../../../src/services/trace/traceStore')
    const sessionId = 'test-session'
    const today = new Date().toISOString().split('T')[0]

    await createSessionEntry(sessionId, 'claude-3-opus', testDir)
    await appendTraceRecord(sessionId, { type: 'request', timestamp: '2026-05-29T10:00:00Z', data: {} }, today, testDir)
    await appendTraceRecord(sessionId, { type: 'response', timestamp: '2026-05-29T10:00:01Z', data: {} }, today, testDir)
    await new Promise(r => setTimeout(r, 100))

    const records = await getSessionTrace(sessionId, testDir)
    expect(records).toHaveLength(2)
    expect(records[0].type).toBe('request')
    expect(records[1].type).toBe('response')
  })
})
