/**
 * Trace 查看器服务
 * 提供 HTTP server、SSE 广播和静态文件服务
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { listSessions, getSessionTrace, getAdjacentRecords, reindex } from './traceStore.js'
import { traceLogger } from './traceLogger.js'
import { createRuntimeServer } from './runtime/server.js'
import { startPeriodicFlush, registerExitHandler } from './index-lock.js'
import { initTurnCounter } from './traceRecorder.js'
import { computeDiff } from './diff.js'

// ESM 兼容：获取当前模块的 __dirname 等效值
// 编译后的二进制中 import.meta.url 不可靠，改用 process.argv[1]
const _dirname = (() => {
  try {
    // 优先使用二进制所在路径（编译后）
    if (typeof __dirname !== 'undefined' && !__dirname.includes('bundle')) return __dirname
    // 二进制路径（编译后，cli 与其 viewer 同目录）
    const binPath = typeof process !== 'undefined' && process.argv[1]
      ? dirname(process.argv[1])
      : null
    if (binPath && binPath !== '.') {
      // 检查 viewer 文件是否存在
      const { existsSync } = require('fs')
      if (existsSync(join(binPath, 'viewer', 'viewer.html'))) {
        return binPath
      }
      // [spec:trace-recording#dist/ 目录作为回退路径]
      // Node.js 构建产物：process.argv[1] 在 dist/miniclaude-node.js
      // viewer 文件在 dist/viewer/viewer.html，需检查父目录的 dist/viewer/
      const parentDir = join(binPath, '..')
      const distViewerPath = join(parentDir, 'dist', 'viewer', 'viewer.html')
      if (existsSync(distViewerPath)) {
        return join(parentDir, 'dist')
      }
    }
  } catch (e) {
    console.debug('[trace] _dirname fallback check failed:', e);
  }
  // 开发模式：使用 ESM 路径
  return dirname(fileURLToPath(import.meta.url))
})()

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
    // 清理已断开的客户端
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

  const encoder = new TextEncoder()
  for (const client of sseClients) {
    try {
      client.enqueue(encoder.encode(data))
    } catch {
      sseClients.delete(client)
    }
  }
}

/**
 * 统一的 SSE 流处理
 */
function handleSseStream(req: Request, idleTimeoutSeconds: number): Response {
  const stream = new ReadableStream({
    start(controller) {
      sseClients.add(controller)
      traceLogger.sseClientConnected(sseClients.size)

      // 发送连接确认
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      // 心跳保活
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
      ...securityHeaders(),
    }
  })
}

/**
 * 公共路由处理函数 — 所有运行时共享
 * 统一返回 Response 对象
 */
async function handleTraceRequest(
  url: URL,
  req: Request,
  viewerHtml: string,
  dashboardHtml: string,
): Promise<Response> {
  traceLogger.debug(`Request: ${url.pathname}`)

  // API endpoint: 会话列表
  if (url.pathname === '/api/traces' || url.pathname === '/api/sessions') {
    return listSessions().then(sessions =>
      jsonResponse(sessions)
    ).catch(err =>
      jsonResponse({ error: err.message }, 500)
    )
  }

  // API endpoint: 会话详情
  if (url.pathname.match(/^\/api\/traces\/[^/]+$/)) {
    const sessionId = url.pathname.split('/').pop()
    if (!sessionId) return jsonResponse({ error: 'Missing session ID' }, 400)
    return getSessionTrace(sessionId).then(records =>
      jsonResponse(records)
    ).catch(err =>
      jsonResponse({ error: err.message }, 500)
    )
  }

  // API endpoint: dashboard 会话记录
  if (url.pathname.match(/^\/api\/sessions\/[^/]+\/records$/)) {
    const parts = url.pathname.split('/')
    const sessionId = parts[3]
    return getSessionTrace(sessionId).then(records =>
      jsonResponse(records)
    ).catch(err =>
      jsonResponse({ error: err.message }, 500)
    )
  }

  // API endpoint: 相邻请求 diff
  if (url.pathname.match(/^\/api\/sessions\/([^/]+)\/diff$/)) {
    const match = url.pathname.match(/^\/api\/sessions\/([^/]+)\/diff$/)
    const sessionId = match![1]
    const turn = parseInt(url.searchParams.get('turn') || '0', 10)
    if (!turn) {
      return jsonResponse({ error: 'missing turn parameter' }, 400)
    }
    return getAdjacentRecords(sessionId, turn).then(({ prev, next }) => {
      const diffResult = prev?.data?.body && next?.data?.body
        ? computeDiff(
            JSON.stringify(prev.data.body, null, 2),
            JSON.stringify(next.data.body, null, 2)
          )
        : []
      return jsonResponse({ prev, next, diff: diffResult })
    }).catch(err =>
      jsonResponse({ error: err.message }, 500)
    )
  }

  // API endpoint: dashboard 导出 JSONL
  if (url.pathname.match(/^\/api\/sessions\/[^/]+\/export\/jsonl$/)) {
    const parts = url.pathname.split('/')
    const sessionId = parts[3]
    return getSessionTrace(sessionId).then(records => {
      const jsonl = records.map(r => JSON.stringify(r)).join('\n')
      return new Response(jsonl, {
        headers: {
          'Content-Type': 'application/jsonl',
          'Content-Disposition': `attachment; filename="${sessionId}.jsonl"`,
          ...securityHeaders(),
        }
      })
    }).catch(err =>
      jsonResponse({ error: err.message }, 500)
    )
  }

  // API endpoint: dashboard 导出 HTML
  if (url.pathname.match(/^\/api\/sessions\/[^/]+\/html$/)) {
    const parts = url.pathname.split('/')
    const sessionId = parts[3]
    return getSessionTrace(sessionId).then(records => {
      const dataBase64 = Buffer.from(JSON.stringify(records)).toString('base64')
      const exportHtml = viewerHtml.replace(
        '</head>',
        `<script>window._traceData = JSON.parse(atob('${dataBase64}'));</script></head>`
      )
      return new Response(exportHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${sessionId}.html"`,
          ...securityHeaders(),
        }
      })
    }).catch(err =>
      jsonResponse({ error: err.message }, 500)
    )
  }

  // API endpoint: dashboard 导出日志
  if (url.pathname.match(/^\/api\/sessions\/[^/]+\/export\/log$/)) {
    const parts = url.pathname.split('/')
    const sessionId = parts[3]
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
          'Content-Disposition': `attachment; filename="${sessionId}.log"`,
          ...securityHeaders(),
        }
      })
    }).catch(err =>
      jsonResponse({ error: err.message }, 500)
    )
  }

  // Dashboard 路径
  if (url.pathname === '/dashboard') {
    return htmlResponse(dashboardHtml)
  }

  // 根路径返回 viewer（注入 LIVE_MODE 进入实时模式）
  const liveHtml = viewerHtml.replace(
    '</head>',
    '<script>window.LIVE_MODE = true;</script></head>'
  )
  return htmlResponse(liveHtml)
}

// 统一的安全头
function securityHeaders(): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'Access-Control-Allow-Origin': 'localhost',
    'X-Content-Type-Options': 'nosniff',
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...securityHeaders() }
  })
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html', ...securityHeaders() }
  })
}

/**
 * 启动 trace server
 */
export async function startTraceServer(options: TraceServerOptions = {}): Promise<{ port: number; stop: () => void }> {
  const { port = 3845, onPort } = options

  // 读取 viewer 文件（优先使用嵌入的宏，回退到文件系统）
  let viewerHtml: string
  let dashboardHtml: string

  try {
    // 编译后的二进制优先使用嵌入的 HTML
    const macroViewer = (typeof globalThis !== 'undefined' && (globalThis as any).MACRO_VIEWER_HTML) ?? ''
    const macroDashboard = (typeof globalThis !== 'undefined' && (globalThis as any).MACRO_DASHBOARD_HTML) ?? ''
    if (macroViewer && macroDashboard) {
      viewerHtml = macroViewer
      dashboardHtml = macroDashboard
    } else {
      // 开发模式：从文件系统读取
      const viewerPath = join(_dirname, 'viewer', 'viewer.html')
      const dashboardPath = join(_dirname, 'viewer', 'dashboard.html')
      viewerHtml = readFileSync(viewerPath, 'utf-8')
      dashboardHtml = readFileSync(dashboardPath, 'utf-8')
    }
  } catch (error) {
    throw new Error(`Failed to read viewer files: ${error}`)
  }

  const idleTimeoutSeconds = resolveIdleTimeout(options)
  startPeriodicFlush()
  registerExitHandler()

  // 启动时恢复 Turn 计数器（关键路径，必须等待完成）
  await initTurnCounter().catch(() => {})

  // reindex 可 fire-and-forget（非关键路径）
  reindex().then(result => {
    if (result.recovered > 0) {
      traceLogger.info(`Reindex recovered ${result.recovered} sessions (total: ${result.total})`)
    }
  }).catch(err => {
    traceLogger.warn(`Reindex failed (non-fatal): ${err}`)
  })

  const httpServer = createRuntimeServer()

  return await httpServer.serve(async (req) => {
    const url = new URL(req.url)

    // SSE endpoint
    if (url.pathname === '/events') {
      return handleSseStream(req, idleTimeoutSeconds)
    }

    // 所有非 SSE 路由通过 handleTraceRequest 统一处理
    return handleTraceRequest(url, req, viewerHtml, dashboardHtml)
  })
}

/**
 * 打开浏览器
 */
export function openBrowser(url: string): void {
  const platform = process.platform
  if (typeof Bun !== 'undefined') {
    // Bun 路径
    if (platform === 'win32') {
      Bun.spawn(['rundll32', 'url,OpenURL', url])
    } else {
      const command = platform === 'darwin' ? 'open' : 'xdg-open'
      Bun.spawn([command, url])
    }
  } else {
    // Node.js 路径
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
  }
}
