import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdjacentRecords } from '../../../src/services/trace/traceStore.js'

const TEST_DIR = join(import.meta.dirname, '.test-traces')
const today = new Date().toISOString().split('T')[0]
const TRACES_DIR = join(TEST_DIR, 'traces')

function createTestRecord(sessionId: string, turn: number) {
  return {
    type: 'response',
    timestamp: new Date(Date.now() + turn * 1000).toISOString(),
    data: {
      turn,
      body: `response-${turn}`,
      usage: { input_tokens: 10 * turn, output_tokens: 20 * turn }
    }
  }
}

function writeSessionTrace(sessionId: string, turns: number[]) {
  const sessionDir = join(TRACES_DIR, today)
  if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true })
  const lines = turns.map(t => JSON.stringify(createTestRecord(sessionId, t)))
  writeFileSync(join(sessionDir, `${sessionId}.jsonl`), lines.join('\n') + '\n')
}

function writeIndex(sessionId: string) {
  const index = {
    sessions: [
      {
        id: sessionId,
        date: today,
        model: 'test-model',
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        turns: 3,
        lastTurn: 3,
        totalInputTokens: 60,
        totalOutputTokens: 120
      }
    ]
  }
  writeFileSync(join(TRACES_DIR, 'index.json'), JSON.stringify(index, null, 2))
}

describe('getAdjacentRecords', () => {
  beforeEach(() => {
    if (!existsSync(TRACES_DIR)) mkdirSync(TRACES_DIR, { recursive: true })
    writeSessionTrace('test-session', [1, 2, 3])
    writeIndex('test-session')
  })

  afterEach(() => {
    try { rmSync(TEST_DIR, { recursive: true, force: true }) } catch {}
  })

  it('should return prev and next for valid turn', async () => {
    const result = await getAdjacentRecords('test-session', 2, TEST_DIR)
    expect(result).toHaveProperty('prev')
    expect(result).toHaveProperty('next')
    expect(result.prev?.data.turn).toBe(1)
    expect(result.next?.data.turn).toBe(3)
  })

  it('should return null prev for first turn', async () => {
    const result = await getAdjacentRecords('test-session', 1, TEST_DIR)
    expect(result.prev).toBeNull()
    expect(result.next?.data.turn).toBe(2)
  })

  it('should return null next for last turn', async () => {
    const result = await getAdjacentRecords('test-session', 3, TEST_DIR)
    expect(result.prev?.data.turn).toBe(2)
    expect(result.next).toBeNull()
  })

  it('should return null both for non-existent turn', async () => {
    const result = await getAdjacentRecords('test-session', 999, TEST_DIR)
    expect(result.prev).toBeNull()
    expect(result.next).toBeNull()
  })
})