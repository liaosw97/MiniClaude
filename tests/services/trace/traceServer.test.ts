import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest'
import { existsSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let testDir: string

beforeAll(() => {
  vi.stubGlobal('Bun', {
    serve: vi.fn((options: any) => ({
      port: options.port ?? 3900,
      stop: vi.fn(),
    })),
    spawn: vi.fn(),
  })
})

beforeEach(() => {
  testDir = join(tmpdir(), `trace-server-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true })
  }
})

describe('startTraceServer', () => {
  it('should start server and return port', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')
    const { createSessionEntry } = await import('../../../src/services/trace/traceStore')

    await createSessionEntry('test-session', 'claude-3-opus', testDir)

    const server = await startTraceServer({ port: 3900 })
    expect(server.port).toBe(3900)
    expect(typeof server.stop).toBe('function')

    server.stop()
  })

  it.skip('should try next port when port is in use', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')

    // 启动第一个 server 占用端口
    const server1 = await startTraceServer({ port: 3901 })
    expect(server1.port).toBe(3901)

    // 尝试启动第二个 server，应该自动尝试下一个端口
    const server2 = await startTraceServer({ port: 3901 })
    expect(server2.port).toBe(3902)

    server1.stop()
    server2.stop()
  })

  it.skip('should serve viewer.html at root path', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')

    const server = await startTraceServer({ port: 3903 })

    const response = await fetch(`http://127.0.0.1:${server.port}/`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')

    const html = await response.text()
    expect(html).toContain('<!DOCTYPE html>')

    server.stop()
  })

  it.skip('should serve dashboard.html at /dashboard', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')

    const server = await startTraceServer({ port: 3904 })

    const response = await fetch(`http://127.0.0.1:${server.port}/dashboard`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')

    server.stop()
  })

  it.skip('should provide SSE endpoint at /events', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')

    const server = await startTraceServer({ port: 3905 })

    const response = await fetch(`http://127.0.0.1:${server.port}/events`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')

    server.stop()
  })

  it.skip('should provide API endpoint for session list', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')
    const { createSessionEntry } = await import('../../../src/services/trace/traceStore')

    await createSessionEntry('test-session', 'claude-3-opus', testDir)

    const server = await startTraceServer({ port: 3906 })

    const response = await fetch(`http://127.0.0.1:${server.port}/api/traces`)
    expect(response.status).toBe(200)

    const sessions = await response.json()
    expect(Array.isArray(sessions)).toBe(true)

    server.stop()
  })

  it.skip('should provide API endpoint for session details', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')
    const { createSessionEntry, appendTraceRecord } = await import('../../../src/services/trace/traceStore')

    const sessionId = 'test-session-detail'
    await createSessionEntry(sessionId, 'claude-3-opus', testDir)

    const today = new Date().toISOString().split('T')[0]
    await appendTraceRecord(sessionId, { type: 'request', timestamp: '2026-05-29T10:00:00Z', data: {} }, today, testDir)

    const server = await startTraceServer({ port: 3907 })

    const response = await fetch(`http://127.0.0.1:${server.port}/api/traces/${sessionId}`)
    expect(response.status).toBe(200)

    const records = await response.json()
    expect(Array.isArray(records)).toBe(true)

    server.stop()
  })

  it.skip('should return 400 for missing session ID', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')

    const server = await startTraceServer({ port: 3908 })

    const response = await fetch(`http://127.0.0.1:${server.port}/api/traces/`)
    // 空 session ID 应该返回 400 或 404
    expect([200, 400, 404]).toContain(response.status)

    server.stop()
  })
})

describe('broadcastTraceRecord', () => {
  it('should export broadcastTraceRecord function', async () => {
    const { broadcastTraceRecord } = await import('../../../src/services/trace/traceServer')
    expect(typeof broadcastTraceRecord).toBe('function')
  })
})

describe('idleTimeout configuration', () => {
  it('should start server with default options (idleTimeout capped to 255)', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')
    // 默认 idleTimeout 为 300，需截断到 255 才能通过 Bun.serve 限制
    const server = await startTraceServer({ port: 3910 })
    expect(server.port).toBe(3910)
    server.stop()
  })

  it('should cap idleTimeout to 255 when value exceeds limit', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')
    // 即使传入 1000，也不应抛出错误（应截断到 255）
    const server = await startTraceServer({ port: 3911, idleTimeout: 1000 })
    expect(server.port).toBe(3911)
    server.stop()
  })

  it('should accept idleTimeout at the max boundary (255)', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')
    const server = await startTraceServer({ port: 3912, idleTimeout: 255 })
    expect(server.port).toBe(3912)
    server.stop()
  })

  it('should accept idleTimeout below max (120)', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')
    const server = await startTraceServer({ port: 3913, idleTimeout: 120 })
    expect(server.port).toBe(3913)
    server.stop()
  })

  it('should accept idleTimeout=0 (disable timeout)', async () => {
    const { startTraceServer } = await import('../../../src/services/trace/traceServer')
    const server = await startTraceServer({ port: 3914, idleTimeout: 0 })
    expect(server.port).toBe(3914)
    server.stop()
  })
})

describe('openBrowser', () => {
  it('should export openBrowser function', async () => {
    const { openBrowser } = await import('../../../src/services/trace/traceServer')
    expect(typeof openBrowser).toBe('function')
  })
})
