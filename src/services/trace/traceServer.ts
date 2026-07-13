/**
 * Trace 查看器服务
 * 提供 HTTP server、SSE 广播和静态文件服务
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'
import { createServer, type Server } from 'http'
import { listSessions, getSessionTrace } from './traceStore.js'
import { traceLogger } from './traceLogger.js'

export interface TraceServerOptions {
  port?: number
  onPort?: (port: number) => void
  idleTimeout?: number  // 秒为单位
}

/**
 * 解析 idleTimeout 配置
 * 优先级：函数参数 > 环境变量 > 默认值（255 秒）
 * 上限：255 秒（Bun.serve 硬性限制）
 */
function resolveIdleTimeout(options: TraceServerOptions): number {
  const MAX_IDLE_TIMEOUT = 255
  let resolved: number

  // 1. 函数参数优先
  if (options.idleTimeout !== undefined) {
    resolved = options.idleTimeout
  } else {
    // 2. 环境变量
    const envValue = process.env.CLAUDE_TRACE_IDLE_TIMEOUT
    if (envValue) {
      const parsed = parseInt(envValue, 10)
      if (!isNaN(parsed) && parsed >= 0) {
        resolved = parsed
      } else {
        traceLogger.warn(`Invalid CLAUDE_TRACE_IDLE_TIMEOUT value: ${envValue}, using default`)
        resolved = MAX_IDLE_TIMEOUT
      }
    } else {
      // 3. 默认值 255 秒
      resolved = MAX_IDLE_TIMEOUT
    }
  }

  // 截断到 Bun.serve 上限
  if (resolved > MAX_IDLE_TIMEOUT) {
    traceLogger.warn(`idleTimeout ${resolved}s exceeds max ${MAX_IDLE_TIMEOUT}s, capping`)
    resolved = MAX_IDLE_TIMEOUT
  }

  return resolved
}

// SSE 客户端集合（Bun 路径使用 ReadableStreamDefaultController）
const sseClients = new Set<ReadableStreamDefaultController>()

// Node.js 路径的 SSE 客户端集合
interface NodeSseClient {
  res: import('http').ServerResponse
  heartbeat?: ReturnType<typeof setInterval>
}
const nodeSseClients = new Set<NodeSseClient>()

// 客户端清理定时器
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * 启动客户端清理定时器
 */
function startCleanupTimer(idleTimeoutSeconds: number): void {
  if (cleanupTimer) return

  // 清理间隔 = idleTimeout / 3，最大 60 秒
  const cleanupIntervalMs = idleTimeoutSeconds > 0
    ? Math.min((idleTimeoutSeconds * 1000) / 3, 60000)
    : 60000

  cleanupTimer = setInterval(() => {
    // 清理已断开的客户端（Bun 路径）
    for (const client of sseClients) {
      try {
        // 尝试发送心跳来检测客户端是否还连接着
        const encoder = new TextEncoder()
        client.enqueue(encoder.encode(': cleanup\n\n'))
      } catch {
        // 客户端已断开，移除
        sseClients.delete(client)
      }
    }
    // 清理已断开的客户端（Node.js 路径）
    for (const client of nodeSseClients) {
      try {
        client.res.write(': cleanup\n\n')
      } catch {
        clearInterval(client.heartbeat)
        nodeSseClients.delete(client)
      }
    }
  }, cleanupIntervalMs)
}

/**
 * 停止客户端清理定时器
 */
function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

/**
 * 广播 trace 记录给所有连接的 SSE 客户端
 */
export function broadcastTraceRecord(record: unknown): void {
  const data = `data: ${JSON.stringify(record)}\n\n`

  // Node.js 路径
  for (const client of nodeSseClients) {
    try {
      client.res.write(data)
    } catch {
      clearInterval(client.heartbeat)
      nodeSseClients.delete(client)
      traceLogger.sseClientDisconnected(nodeSseClients.size)
    }
  }

  // Bun 路径（原始代码）
  const encoder = new TextEncoder()
  for (const client of sseClients) {
    try {
      client.enqueue(encoder.encode(data))
    } catch {
      // 客户端断开，移除
      sseClients.delete(client)
    }
  }
}

/**
 * 公共路由处理函数 — 被 Bun 和 Node.js 路径共享
 * 通过 ResponseAdapter 抽象响应对象的差异
 */
interface ResponseAdapter {
  writeHead(status: number, headers: Record<string, string>): void
  end(body: string): void
  write(data: string): void
  setHeader(name: string, value: string): void
}

function handleTraceRequest(
  url: URL,
  res: ResponseAdapter,
  viewerHtml: string,
  dashboardHtml: string,
  idleTimeoutSeconds: number,
): void {
  traceLogger.debug(`Request: ${url.pathname}`)

  // SSE endpoint
  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    res.write('data: {"type":"connected"}\n\n')
    return
  }

  // Dashboard 路径
  if (url.pathname === '/dashboard') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html')
    res.end(dashboardHtml)
    return
  }

  // API endpoint: 会话列表
  if (url.pathname === '/api/traces' || url.pathname === '/api/sessions') {
    listSessions().then(sessions => {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(sessions))
    }).catch(err => {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    })
    return
  }

  // API endpoint: 会话详情
  if (url.pathname.match(/^\/api\/traces\/[^/]+$/)) {
    const sessionId = url.pathname.split('/').pop()
    if (!sessionId) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Missing session ID' }))
      return
    }
    getSessionTrace(sessionId).then(records => {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(records))
    }).catch(err => {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    })
    return
  }

  // API endpoint: dashboard 会话记录
  if (url.pathname.match(/^\/api\/sessions\/[^/]+\/records$/)) {
    const parts = url.pathname.split('/')
    const sessionId = parts[3]
    getSessionTrace(sessionId).then(records => {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(records))
    }).catch(err => {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    })
    return
  }

  // API endpoint: dashboard 导出 JSONL
  if (url.pathname.match(/^\/api\/sessions\/[^/]+\/export\/jsonl$/)) {
    const parts = url.pathname.split('/')
    const sessionId = parts[3]
    getSessionTrace(sessionId).then(records => {
      const jsonl = records.map(r => JSON.stringify(r)).join('\n')
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/jsonl')
      res.setHeader('Content-Disposition', `attachment; filename="${sessionId}.jsonl"`)
      res.end(jsonl)
    }).catch(err => {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    })
    return
  }

  // API endpoint: dashboard 导出 HTML
  if (url.pathname.match(/^\/api\/sessions\/[^/]+\/html$/)) {
    const parts = url.pathname.split('/')
    const sessionId = parts[3]
    getSessionTrace(sessionId).then(records => {
      const dataBase64 = Buffer.from(JSON.stringify(records)).toString('base64')
      const exportHtml = viewerHtml.replace(
        '</head>',
        `<script>window._traceData = JSON.parse(atob('${dataBase64}'));</script></head>`
      )
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="${sessionId}.html"`)
      res.end(exportHtml)
    }).catch(err => {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    })
    return
  }

  // API endpoint: dashboard 导出日志
  if (url.pathname.match(/^\/api\/sessions\/[^/]+\/export\/log$/)) {
    const parts = url.pathname.split('/')
    const sessionId = parts[3]
    getSessionTrace(sessionId).then(records => {
      const log = records.map(r => {
        const ts = r.timestamp || ''
        const type = r.type || 'unknown'
        const data = r.data ? JSON.stringify(r.data, null, 2) : ''
        return `[${ts}] ${type}\n${data}`
      }).join('\n\n---\n\n')
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('Content-Disposition', `attachment; filename="${sessionId}.log"`)
      res.end(log)
    }).catch(err => {
      res.statusCode = 500
      res.end(JSON.stringify({ error: err.message }))
    })
    return
  }

  // 根路径返回 viewer（注入 LIVE_MODE 进入实时模式）
  const liveHtml = viewerHtml.replace(
    '</head>',
    '<script>window.LIVE_MODE = true;</script></head>'
  )
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html')
  res.end(liveHtml)
}

/**
 * 启动 trace server
 */
export async function startTraceServer(options: TraceServerOptions = {}): Promise<{ port: number; stop: () => void }> {
  const { port = 3845, onPort } = options

  // 读取 viewer 文件（Bun 和 Node 共享）
  const viewerPath = join(__dirname, 'viewer', 'viewer.html')
  const dashboardPath = join(__dirname, 'viewer', 'dashboard.html')

  let viewerHtml: string
  let dashboardHtml: string

  try {
    viewerHtml = readFileSync(viewerPath, 'utf-8')
    dashboardHtml = readFileSync(dashboardPath, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to read viewer files: ${error}`)
  }

  const idleTimeoutSeconds = resolveIdleTimeout(options)

  if (typeof Bun === 'undefined') {
    // ===== Node.js 路径：使用 http.createServer =====
    return await startNodeTraceServer({
      port, onPort, viewerHtml, dashboardHtml, idleTimeoutSeconds,
    })
  }

  // 尝试启动 server，端口占用时自动尝试其他端口
  let server: ReturnType<typeof Bun.serve>
  let actualPort = port

  for (let i = 0; i < 10; i++) {
    try {
      server = Bun.serve({
        port: actualPort,
        idleTimeout: idleTimeoutSeconds,
        fetch(req) {
          const url = new URL(req.url)

          // SSE endpoint — Bun 使用 ReadableStream
          if (url.pathname === '/events') {
            const stream = new ReadableStream({
              start(controller) {
                sseClients.add(controller)
                traceLogger.sseClientConnected(sseClients.size)

                // 发送连接确认
                const encoder = new TextEncoder()
                controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

                // 心跳保活 - 根据 idleTimeout 自动计算
                const heartbeatIntervalMs = idleTimeoutSeconds > 0
                  ? (idleTimeoutSeconds * 1000) / 5
                  : 5000

                const heartbeat = setInterval(() => {
                  try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'))
                  } catch {
                    clearInterval(heartbeat)
                    sseClients.delete(controller)
                    traceLogger.sseClientDisconnected(sseClients.size)
                  }
                }, heartbeatIntervalMs)

                // 客户端断开时清理
                req.signal.addEventListener('abort', () => {
                  clearInterval(heartbeat)
                  sseClients.delete(controller)
                  traceLogger.sseClientDisconnected(sseClients.size)
                  try { controller.close() } catch {}
                })
              }
            })

            return new Response(stream, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
              }
            })
          }

          // Dashboard 路径
          if (url.pathname === '/dashboard') {
            return new Response(dashboardHtml, {
              headers: { 'Content-Type': 'text/html' }
            })
          }

          // API endpoint: 会话列表 (兼容 /api/traces 和 /api/sessions)
          if (url.pathname === '/api/traces' || url.pathname === '/api/sessions') {
            return listSessions().then(sessions =>
              Response.json(sessions)
            )
          }

          // API endpoint: 会话详情 (兼容 /api/traces/:id 和 /api/sessions/:id/records)
          if (url.pathname.match(/^\/api\/traces\/[^/]+$/)) {
            const sessionId = url.pathname.split('/').pop()
            if (!sessionId) {
              return Response.json({ error: 'Missing session ID' }, { status: 400 })
            }
            return getSessionTrace(sessionId).then(records =>
              Response.json(records)
            )
          }

          // API endpoint: dashboard 会话记录 (/api/sessions/:id/records)
          if (url.pathname.match(/^\/api\/sessions\/[^/]+\/records$/)) {
            const parts = url.pathname.split('/')
            const sessionId = parts[3]
            if (!sessionId) {
              return Response.json({ error: 'Missing session ID' }, { status: 400 })
            }
            return getSessionTrace(sessionId).then(records =>
              Response.json(records)
            )
          }

          // API endpoint: dashboard 导出 JSONL (/api/sessions/:id/export/jsonl)
          if (url.pathname.match(/^\/api\/sessions\/[^/]+\/export\/jsonl$/)) {
            const parts = url.pathname.split('/')
            const sessionId = parts[3]
            if (!sessionId) {
              return Response.json({ error: 'Missing session ID' }, { status: 400 })
            }
            return getSessionTrace(sessionId).then(records => {
              const jsonl = records.map(r => JSON.stringify(r)).join('\n')
              return new Response(jsonl, {
                headers: {
                  'Content-Type': 'application/jsonl',
                  'Content-Disposition': `attachment; filename="${sessionId}.jsonl"`
                }
              })
            })
          }

          // API endpoint: dashboard 导出 HTML (/api/sessions/:id/html)
          if (url.pathname.match(/^\/api\/sessions\/[^/]+\/html$/)) {
            const parts = url.pathname.split('/')
            const sessionId = parts[3]
            if (!sessionId) {
              return Response.json({ error: 'Missing session ID' }, { status: 400 })
            }
            return getSessionTrace(sessionId).then(records => {
              const dataBase64 = Buffer.from(JSON.stringify(records)).toString('base64')
              const exportHtml = viewerHtml.replace(
                '</head>',
                `<script>window._traceData = JSON.parse(atob('${dataBase64}'));</script></head>`
              )
              return new Response(exportHtml, {
                headers: {
                  'Content-Type': 'text/html',
                  'Content-Disposition': `attachment; filename="${sessionId}.html"`
                }
              })
            })
          }

          // API endpoint: dashboard 导出日志 (/api/sessions/:id/export/log)
          if (url.pathname.match(/^\/api\/sessions\/[^/]+\/export\/log$/)) {
            const parts = url.pathname.split('/')
            const sessionId = parts[3]
            if (!sessionId) {
              return Response.json({ error: 'Missing session ID' }, { status: 400 })
            }
            return getSessionTrace(sessionId).then(records => {
              const log = records.map(r => {
                const ts = r.timestamp || ''
                const type = r.type || 'unknown'
                const data = r.data ? JSON.stringify(r.data, null, 2) : ''
                return `[${ts}] ${type}\n${data}`
              }).join('\n\n---\n\n')
              return new Response(log, {
                headers: {
                  'Content-Type': 'text/plain',
                  'Content-Disposition': `attachment; filename="${sessionId}.log"`
                }
              })
            })
          }

          // 根路径返回 viewer（注入 LIVE_MODE 进入实时模式）
          const liveHtml = viewerHtml.replace(
            '</head>',
            '<script>window.LIVE_MODE = true;</script></head>'
          )
          return new Response(liveHtml, {
            headers: { 'Content-Type': 'text/html' }
          })
        }
      })

      // 启动成功
      traceLogger.serverStarted(actualPort)
      if (onPort) onPort(actualPort)
      startCleanupTimer(idleTimeoutSeconds)
      break
    } catch (error: any) {
      if (error.code === 'EADDRINUSE' || error.message?.includes('address already in use')) {
        traceLogger.portFallback(actualPort, actualPort + 1)
        actualPort++
        continue
      }
      throw error
    }
  }

  if (!server) {
    throw new Error('Failed to start trace server: all ports exhausted')
  }

  return {
    port: actualPort,
    stop: () => {
      stopCleanupTimer()
      server.stop()
    }
  }
}

/**
 * Node.js 路径的 trace server 启动
 */
async function startNodeTraceServer(options: {
  port: number
  onPort?: (port: number) => void
  viewerHtml: string
  dashboardHtml: string
  idleTimeoutSeconds: number
}): Promise<{ port: number; stop: () => void }> {
  const { port, onPort, viewerHtml, dashboardHtml, idleTimeoutSeconds } = options
  let actualPort = port

  for (let i = 0; i < 10; i++) {
    try {
      const server = createServer((req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

        // SSE endpoint — Node.js 使用 res.writeHead + res.write
        if (url.pathname === '/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          })

          res.write('data: {"type":"connected"}\n\n')

          const client: NodeSseClient = { res }
          nodeSseClients.add(client)
          traceLogger.sseClientConnected(nodeSseClients.size)

          const heartbeatIntervalMs = idleTimeoutSeconds > 0
            ? (idleTimeoutSeconds * 1000) / 5
            : 5000

          client.heartbeat = setInterval(() => {
            try {
              res.write(': heartbeat\n\n')
            } catch {
              clearInterval(client.heartbeat!)
              nodeSseClients.delete(client)
              traceLogger.sseClientDisconnected(nodeSseClients.size)
            }
          }, heartbeatIntervalMs)

          req.on('close', () => {
            clearInterval(client.heartbeat!)
            nodeSseClients.delete(client)
            traceLogger.sseClientDisconnected(nodeSseClients.size)
          })

          return
        }

        // 非 SSE 路由，通过适配器复用公共路由
        const nodeAdapter: ResponseAdapter = {
          writeHead: (status, headers) => res.writeHead(status, headers),
          end: (body) => res.end(body),
          write: (data) => res.write(data),
          setHeader: (name, value) => res.setHeader(name, value),
        }
        Object.defineProperty(nodeAdapter, 'statusCode', {
          get: () => res.statusCode,
          set: (v) => { res.statusCode = v },
        })

        handleTraceRequest(url, nodeAdapter, viewerHtml, dashboardHtml, idleTimeoutSeconds)
      })

      await new Promise<void>((resolve, reject) => {
        server.listen(actualPort, () => {
          resolve()
        })
        server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            traceLogger.portFallback(actualPort, actualPort + 1)
            actualPort++
            resolve() // 继续循环尝试下一端口
          } else {
            reject(err)
          }
        })
      })

      // 启动成功
      traceLogger.serverStarted(actualPort)
      if (onPort) onPort(actualPort)
      startCleanupTimer(idleTimeoutSeconds)

      return {
        port: actualPort,
        stop: () => {
          stopCleanupTimer()
          server.close()
        }
      }
    } catch (error: any) {
      // 如果是 EADDRINUSE 且已重试完所有端口
      if (actualPort > port + 9) {
        throw new Error('Failed to start trace server: all ports exhausted')
      }
      throw error
    }
  }

  throw new Error('Failed to start trace server: all ports exhausted')
}

/**
 * 打开浏览器
 */
export function openBrowser(url: string): void {
  if (typeof Bun === 'undefined') {
    // Node.js 路径：使用 child_process.spawn
    const platform = process.platform
    let child
    if (platform === 'win32') {
      child = spawn('rundll32', ['url,OpenURL', url], { detached: true, stdio: 'ignore' }).unref()
    } else {
      const command = platform === 'darwin' ? 'open' : 'xdg-open'
      child = spawn(command, [url], { detached: true, stdio: 'ignore' }).unref()
    }
    child?.on('error', (err) => {
      traceLogger.warn(`openBrowser failed: ${err.message}`)
    })
    return
  }

  // Bun 路径
  const platform = process.platform
  if (platform === 'win32') {
    // start 是 cmd 内置命令，不可直接 spawn，改用 rundll32
    Bun.spawn(['rundll32', 'url,OpenURL', url])
  } else {
    const command = platform === 'darwin' ? 'open' : 'xdg-open'
    Bun.spawn([command, url])
  }
}
