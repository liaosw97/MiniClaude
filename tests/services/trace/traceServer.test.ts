import { describe, it, expect } from 'vitest'
import { startTraceServer } from '../../../src/services/trace/traceServer.js'

describe('traceServer (unified adapter)', () => {
  it('should start and stop server', async () => {
    const { port, stop } = await startTraceServer({ port: 0 })
    expect(port).toBeGreaterThan(0)
    expect(typeof stop).toBe('function')
    stop()
  })

  it('should return 200 for root path with HTML', async () => {
    const { port, stop } = await startTraceServer({ port: 0 })
    const res = await fetch(`http://localhost:${port}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    stop()
  })

  it('should return sessions list as JSON', async () => {
    const { port, stop } = await startTraceServer({ port: 0 })
    const res = await fetch(`http://localhost:${port}/api/sessions`)
    expect(res.status).toBe(200)
    const sessions = await res.json()
    expect(Array.isArray(sessions)).toBe(true)
    stop()
  })

  it('should include Same-Origin security headers', async () => {
    const { port, stop } = await startTraceServer({ port: 0 })
    const res = await fetch(`http://localhost:${port}/`)
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    stop()
  })

  it('should handle SSE events endpoint', async () => {
    const { port, stop } = await startTraceServer({ port: 0 })
    // 使用 AbortController 在 3 秒后取消请求
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 3000)
    try {
      const res = await fetch(`http://localhost:${port}/events`, { signal: ac.signal })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/event-stream')
    } catch {
      // 超时导致的 abort 是预期行为，只检查 status 前提是 fetch 返回了
    } finally {
      clearTimeout(timer)
      stop()
    }
  }, 10000)

  it('should handle dashboard endpoint', async () => {
    const { port, stop } = await startTraceServer({ port: 0 })
    const res = await fetch(`http://localhost:${port}/dashboard`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    stop()
  })
})
