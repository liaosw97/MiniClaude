// src/services/trace/runtime/server.ts
import { createServer as _createNodeServer, type Server as NodeServer } from 'http'
import { detectRuntime } from '../../../compat/runtime.js'

export interface HttpServer {
  serve(handler: (req: Request) => Response | Promise<Response>): Promise<{ port: number; stop: () => void }>
}

/**
 * Bun 运行时适配：使用 Bun.serve
 */
export function createBunServer(): HttpServer {
  return {
    async serve(handler) {
      let actualPort = 3845
      let server: ReturnType<typeof Bun.serve> | undefined

      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          server = Bun.serve({ port: actualPort, fetch: handler })
          break
        } catch (error: any) {
          if (error.message?.includes('address already in use') || error.code === 'EADDRINUSE') {
            actualPort++
            continue
          }
          throw error
        }
      }

      if (!server) throw new Error('Failed to start Bun server: all ports exhausted')

      return { port: actualPort, stop: () => server!.stop() }
    }
  }
}

/**
 * Node.js 运行时适配：使用 http.createServer
 */
export function createNodeServer(): HttpServer {
  return {
    async serve(handler) {
      let actualPort = 3845

      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const { server, port } = await tryNodeListen(actualPort, handler)
          return { port, stop: () => server.close() }
        } catch (error: any) {
          if (error.code === 'EADDRINUSE') {
            actualPort++
            continue
          }
          throw error
        }
      }

      throw new Error('Failed to start Node server: all ports exhausted')
    }
  }
}

/**
 * 尝试在指定端口启动 Node.js HTTP 服务器
 * 每次创建新的 server 实例，避免复用失败的 server 导致竞态
 */
function tryNodeListen(
  port: number,
  handler: (req: Request) => Response | Promise<Response>,
): Promise<{ server: NodeServer; port: number }> {
  return new Promise((resolve, reject) => {
    const server = _createNodeServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      const headers: Record<string, string> = {}
      for (const [k, v] of Object.entries(req.headers)) {
        if (v) headers[k] = Array.isArray(v) ? v.join(', ') : v
      }
      const nodeReq = new Request(url.toString(), { method: req.method, headers })

      const response = await handler(nodeReq)
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
      const body = await response.text()
      res.end(body)
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      server.close(() => reject(err)) // 关闭失败的 server 再 reject
    })

    server.listen(port, () => resolve({ server, port }))
  })
}

/**
 * Deno 运行时适配：使用 Deno.serve
 */
export function createDenoServer(): HttpServer {
  return {
    async serve(handler) {
      if (typeof (globalThis as any).Deno?.serve !== 'function') {
        return createNodeServer().serve(handler)
      }

      const deno = globalThis as any
      let actualPort = 3845
      const ac = new AbortController()

      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          deno.Deno.serve({ port: actualPort, signal: ac.signal }, handler)
          return { port: actualPort, stop: () => ac.abort() }
        } catch (error: any) {
          if (error.message?.includes('address already in use') || error.code === 'EADDRINUSE') {
            actualPort++
            continue
          }
          throw error
        }
      }

      throw new Error('Failed to start Deno server: all ports exhausted')
    }
  }
}

/**
 * 根据运行时创建对应的 HTTP 服务器
 */
export function createRuntimeServer(): HttpServer {
  const runtime = detectRuntime()
  switch (runtime) {
    case 'bun':  return createBunServer()
    case 'node': return createNodeServer()
    case 'deno': return createDenoServer()
    default:     return createNodeServer()
  }
}