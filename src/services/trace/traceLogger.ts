/**
 * Trace 日志模块
 * 集成到 MiniClaude 的 debug 系统
 * 日志写入文件，避免与 REPL 对话框输出重叠
 */

import { logForDebugging } from '../../utils/debug.js'
import type { DebugLogLevel } from '../../utils/debug.js'
import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const TRACE_PREFIX = '[trace]'

/**
 * 获取日志文件路径
 */
function getLogFilePath(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
  return join(configDir, 'traces', 'trace-server.log')
}

/**
 * 确保日志目录存在
 */
function ensureLogDir(): void {
  try {
    const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
    mkdirSync(join(configDir, 'traces'), { recursive: true })
  } catch { /* ignore */ }
}

/**
 * 写入日志到文件
 */
function writeToFile(level: string, message: string): void {
  try {
    ensureLogDir()
    const timestamp = new Date().toISOString()
    const line = `${timestamp} [${level}] ${message}\n`
    appendFileSync(getLogFilePath(), line, 'utf-8')
  } catch { /* ignore file write errors */ }
}

/**
 * Trace 日志记录器
 */
export const traceLogger = {
  /**
   * 记录调试信息
   */
  debug(message: string, ...args: unknown[]): void {
    logForDebugging(`${TRACE_PREFIX} ${message}`, { level: 'debug' })
    if (args.length > 0) {
      logForDebugging(`${TRACE_PREFIX} args: ${JSON.stringify(args)}`, { level: 'debug' })
    }
  },

  /**
   * 记录一般信息
   */
  info(message: string, ...args: unknown[]): void {
    logForDebugging(`${TRACE_PREFIX} ${message}`, { level: 'info' })
    if (args.length > 0) {
      logForDebugging(`${TRACE_PREFIX} args: ${JSON.stringify(args)}`, { level: 'info' })
    }
  },

  /**
   * 记录警告信息
   */
  warn(message: string, ...args: unknown[]): void {
    const extra = args.length > 0 ? ` ${JSON.stringify(args)}` : ''
    // 先写入文件，确保即使 logForDebugging 是 no-op 也记录警告
    writeToFile('WARN', `${TRACE_PREFIX} ${message}${extra}`)
    // 再调用 debug 系统
    logForDebugging(`${TRACE_PREFIX} WARN: ${message}`, { level: 'warn' })
    if (args.length > 0) {
      logForDebugging(`${TRACE_PREFIX} args: ${JSON.stringify(args)}`, { level: 'warn' })
    }
  },

  /**
   * 记录错误信息
   */
  error(message: string, error?: unknown): void {
    const isError = error instanceof Error
    let detail = ''
    if (isError) {
      detail = error.message
    } else if (error !== undefined) {
      detail = JSON.stringify(error)
    }
    // 先写入文件，确保即使 logForDebugging 是 no-op 也记录错误
    writeToFile('ERROR', `${TRACE_PREFIX} ${message}${detail ? ` - ${detail}` : ''}`)
    if (isError && error.stack) {
      writeToFile('ERROR', `${TRACE_PREFIX} stack: ${error.stack}`)
    }
    // 再调用 debug 系统（非 debug 模式下为 no-op）
    logForDebugging(`${TRACE_PREFIX} ERROR: ${message}`, { level: 'error' })
    if (detail) {
      logForDebugging(`${TRACE_PREFIX} error: ${detail}`, { level: 'error' })
    }
    if (isError && error.stack) {
      logForDebugging(`${TRACE_PREFIX} stack: ${error.stack}`, { level: 'error' })
    }
  },

  /**
   * 记录 trace 记录创建
   */
  recordCreated(type: string, sessionId: string): void {
    logForDebugging(`${TRACE_PREFIX} Record created: type=${type}, session=${sessionId}`, { level: 'debug' })
  },

  /**
   * 记录 trace 记录写入
   */
  recordWritten(filePath: string, size: number): void {
    logForDebugging(`${TRACE_PREFIX} Record written: file=${filePath}, size=${size}`, { level: 'debug' })
  },

  /**
   * 记录 SSE 客户端连接
   */
  sseClientConnected(clientCount: number): void {
    logForDebugging(`${TRACE_PREFIX} SSE client connected, total: ${clientCount}`, { level: 'debug' })
  },

  /**
   * 记录 SSE 客户端断开
   */
  sseClientDisconnected(clientCount: number): void {
    logForDebugging(`${TRACE_PREFIX} SSE client disconnected, total: ${clientCount}`, { level: 'debug' })
  },

  /**
   * 记录 SSE 广播
   */
  sseBroadcast(recordType: string, clientCount: number): void {
    logForDebugging(`${TRACE_PREFIX} SSE broadcast: type=${recordType}, clients=${clientCount}`, { level: 'debug' })
  },

  /**
   * 记录服务器启动
   */
  serverStarted(port: number): void {
    logForDebugging(`${TRACE_PREFIX} Server started on port ${port}`, { level: 'info' })
  },

  /**
   * 记录服务器停止
   */
  serverStopped(): void {
    logForDebugging(`${TRACE_PREFIX} Server stopped`, { level: 'info' })
  },

  /**
   * 记录端口降级
   */
  portFallback(originalPort: number, newPort: number): void {
    logForDebugging(`${TRACE_PREFIX} Port ${originalPort} in use, trying ${newPort}`, { level: 'warn' })
  },

  /**
   * 记录文件操作
   */
  fileOperation(operation: string, filePath: string): void {
    logForDebugging(`${TRACE_PREFIX} File ${operation}: ${filePath}`, { level: 'debug' })
  },

  /**
   * 记录索引操作
   */
  indexOperation(operation: string, sessionId?: string): void {
    const sessionInfo = sessionId ? `, session=${sessionId}` : ''
    logForDebugging(`${TRACE_PREFIX} Index ${operation}${sessionInfo}`, { level: 'debug' })
  },

  /**
   * 记录 header 脱敏
   */
  headerRedacted(headerName: string): void {
    logForDebugging(`${TRACE_PREFIX} Header redacted: ${headerName}`, { level: 'debug' })
  },

  /**
   * 记录 API 请求
   */
  apiRequest(method: string, url: string): void {
    logForDebugging(`${TRACE_PREFIX} API request: ${method} ${url}`, { level: 'debug' })
  },

  /**
   * 记录 API 响应
   */
  apiResponse(status: number, contentType: string): void {
    logForDebugging(`${TRACE_PREFIX} API response: status=${status}, type=${contentType}`, { level: 'debug' })
  },

  /**
   * 记录 API 错误
   */
  apiError(errorType: string, message: string): void {
    logForDebugging(`${TRACE_PREFIX} API error: ${errorType} - ${message}`, { level: 'warn' })
  },

  /**
   * 记录导出操作
   */
  exportStarted(filePath: string): void {
    logForDebugging(`${TRACE_PREFIX} Export started: ${filePath}`, { level: 'info' })
  },

  /**
   * 记录导出完成
   */
  exportCompleted(outputPath: string, recordCount: number): void {
    logForDebugging(`${TRACE_PREFIX} Export completed: ${outputPath}, records=${recordCount}`, { level: 'info' })
  },

  /**
   * 记录清理操作
   */
  cleanStarted(daysToKeep: number): void {
    logForDebugging(`${TRACE_PREFIX} Clean started: days=${daysToKeep}`, { level: 'info' })
  },

  /**
   * 记录清理完成
   */
  cleanCompleted(deletedCount: number): void {
    logForDebugging(`${TRACE_PREFIX} Clean completed: deleted=${deletedCount}`, { level: 'info' })
  }
}
