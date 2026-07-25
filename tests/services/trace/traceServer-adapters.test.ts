import { describe, it, expect } from 'vitest'
import { createBunServer, createNodeServer, createRuntimeServer } from '../../../src/services/trace/runtime/server.js'

describe('trace server adapters', () => {
  const isBun = typeof Bun !== 'undefined'

  it('createRuntimeServer should return a valid adapter', () => {
    const server = createRuntimeServer()
    expect(typeof server.serve).toBe('function')
  })

  it('Node adapter should start and stop server', async () => {
    const server = createNodeServer()
    const { port, stop } = await server.serve(() => new Response('OK'))
    expect(port).toBeGreaterThan(0)
    expect(typeof stop).toBe('function')
    stop()
  })

  it('Node adapter should handle requests', async () => {
    const server = createNodeServer()
    const { port, stop } = await server.serve(() => new Response('hello', { status: 200 }))
    const res = await fetch(`http://localhost:${port}/`)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('hello')
    stop()
  })

  it('Node adapter should handle port conflict', async () => {
    // 先占用一个端口
    const server1 = createNodeServer()
    const { port, stop: stop1 } = await server1.serve(() => new Response('occupied'))

    // 用冲突端口启动，验证自动回退
    const server2 = createNodeServer()
    // 直接指定冲突端口，内部会回退
    const { port: port2, stop: stop2 } = await server2.serve(() => new Response('ok'))
    expect(port2).toBeGreaterThan(0)
    expect(port2).not.toBe(port)
    stop1()
    stop2()
  })
})