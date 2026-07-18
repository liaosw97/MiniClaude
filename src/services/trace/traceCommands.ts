/**
 * Trace CLI 命令
 */

import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { startTraceServer, openBrowser } from './traceServer.js'
import { listSessions, getSessionTrace, getTraceFilePath } from './traceStore.js'
import { traceLogger } from './traceLogger.js'
import { existsSync, readFileSync, createReadStream } from 'fs'
import { createInterface } from 'readline'

// ESM 兼容：获取当前模块的 __dirname 等效值
const _dirname = (() => {
  try {
    if (typeof __dirname !== 'undefined' && !__dirname.includes('bundle')) return __dirname
    const binPath = typeof process !== 'undefined' && process.argv[1]
      ? dirname(process.argv[1])
      : null
    if (binPath && binPath !== '.') {
      if (existsSync(join(binPath, 'viewer', 'viewer.html'))) {
        return binPath
      }
      // [spec:trace-recording#trace export 命令同样支持 dist/ 回退]
      const parentDir = join(binPath, '..')
      const distViewerPath = join(parentDir, 'dist', 'viewer', 'viewer.html')
      if (existsSync(distViewerPath)) {
        return join(parentDir, 'dist')
      }
    }
  } catch (e) {
    console.debug('[trace] _dirname fallback check failed:', e);
  }
  return dirname(fileURLToPath(import.meta.url))
})()

export async function traceCommand(args: string[]): Promise<void> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'dashboard':
      await traceDashboard()
      break
    case 'view':
      await traceView(args[1])
      break
    case 'export':
      await traceExport(args[1], args[2])
      break
    case 'clean':
      await traceClean(parseInt(args[1]) || 30)
      break
    case 'list':
      await traceList()
      break
    default:
      console.log('Usage: trace <dashboard|view|export|clean|list>')
      console.log('')
      console.log('Commands:')
      console.log('  dashboard    Open trace dashboard in browser')
      console.log('  view <file>  View a trace file in browser')
      console.log('  export <file> [-o output]  Export trace to HTML')
      console.log('  clean [--days N]  Clean old traces (default: 30 days)')
      console.log('  list         List all trace sessions')
      process.exit(1)
  }
}

async function traceDashboard(): Promise<void> {
  traceLogger.info('Starting dashboard')
  try {
    const server = await startTraceServer({
      onPort: (port) => {
        console.log(`[trace] Dashboard started at http://127.0.0.1:${port}/dashboard`)
      }
    })
    openBrowser(`http://127.0.0.1:${server.port}/dashboard`)
  } catch (error: any) {
    traceLogger.error('Failed to start dashboard', error)
    console.error(`[trace] Failed to start dashboard: ${error.message}`)
    process.exit(1)
  }
}

async function traceView(filePath: string): Promise<void> {
  if (!filePath) {
    console.error('[trace] Error: Missing file path')
    console.error('Usage: trace view <file>')
    process.exit(1)
  }

  if (!existsSync(filePath)) {
    console.error(`[trace] Error: File not found: ${filePath}`)
    process.exit(1)
  }

  // 验证 JSONL 格式：读取前几行检查是否为合法 JSON
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      console.error(`[trace] Error: Invalid trace file format: ${filePath}`)
      process.exit(1)
    }
    // 验证第一行是否为合法 JSON
    JSON.parse(lines[0])
  } catch {
    console.error(`[trace] Error: Invalid trace file format: ${filePath}`)
    process.exit(1)
  }

  try {
    const server = await startTraceServer({
      onPort: (port) => {
        console.log(`[trace] Viewer started at http://127.0.0.1:${port}`)
      }
    })
    openBrowser(`http://127.0.0.1:${server.port}`)
  } catch (error: any) {
    console.error(`[trace] Failed to start viewer: ${error.message}`)
    process.exit(1)
  }
}

async function traceExport(filePath: string, outputPath?: string): Promise<void> {
  if (!filePath) {
    console.error('[trace] Error: Missing file path')
    console.error('Usage: trace export <file> [-o output]')
    process.exit(1)
  }

  if (!existsSync(filePath)) {
    console.error(`[trace] Error: File not found: ${filePath}`)
    process.exit(1)
  }

  const outputFile = outputPath || 'trace.html'
  traceLogger.exportStarted(filePath)

  try {
    // 读取 viewer.html 模板（优先使用嵌入的宏）
    let viewerHtml: string
    const macroViewer = (typeof globalThis !== 'undefined' && (globalThis as any).MACRO_VIEWER_HTML) ?? ''
    if (macroViewer) {
      viewerHtml = macroViewer
    } else {
      const viewerPath = join(_dirname, 'viewer', 'viewer.html')
      viewerHtml = readFileSync(viewerPath, 'utf-8')
    }

    // 流式读取 JSONL 文件，逐行收集记录并 base64 编码
    const records: unknown[] = []
    const fileStream = createReadStream(filePath, { encoding: 'utf-8' })
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity })

    for await (const line of rl) {
      const trimmed = line.trim()
      if (trimmed) {
        records.push(JSON.parse(trimmed))
      }
    }

    // 将数据内嵌到 HTML（使用 Buffer 分块 base64 编码避免单次大内存分配）
    const jsonStr = JSON.stringify(records)
    const dataBase64 = Buffer.from(jsonStr).toString('base64')
    const exportHtml = viewerHtml.replace(
      '</head>',
      `<script>window._traceData = JSON.parse(atob('${dataBase64}'));</script></head>`
    )

    // 写入文件
    const { writeFileSync } = await import('fs')
    writeFileSync(outputFile, exportHtml)

    traceLogger.exportCompleted(outputFile, records.length)
    console.log(`[trace] Exported ${records.length} records to ${outputFile}`)
  } catch (error: any) {
    traceLogger.error('Failed to export', error)
    console.error(`[trace] Failed to export: ${error.message}`)
    process.exit(1)
  }
}

async function traceClean(daysToKeep: number): Promise<void> {
  try {
    const sessions = await listSessions()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const oldSessions = sessions.filter(s => new Date(s.date) < cutoffDate)

    if (oldSessions.length === 0) {
      console.log(`[trace] No traces older than ${daysToKeep} days found.`)
      return
    }

    console.log(`[trace] Found ${oldSessions.length} trace(s) older than ${daysToKeep} days.`)

    // 仅在交互式终端请求确认
    if (process.stdin.isTTY) {
      console.log('[trace] Delete? (y/N)')
      const response = await new Promise<string>((resolve) => {
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase())
        })
      })

      if (response !== 'y' && response !== 'yes') {
        console.log('[trace] Cancelled.')
        return
      }
    }

    // 删除旧文件
    const { unlinkSync } = await import('fs')
    for (const session of oldSessions) {
      const filePath = getTraceFilePath(session.id, session.date)
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath)
          console.log(`[trace] Deleted: ${filePath}`)
        } catch (error: any) {
          console.warn(`[trace] Warning: Skipping ${filePath} (${error.code || error.message})`)
        }
      }
    }

    console.log(`[trace] Cleaned ${oldSessions.length} trace(s).`)
  } catch (error: any) {
    console.error(`[trace] Failed to clean: ${error.message}`)
    process.exit(1)
  }
}

async function traceList(): Promise<void> {
  try {
    const sessions = await listSessions()

    if (sessions.length === 0) {
      console.log('[trace] No trace sessions found.')
      return
    }

    console.log(`[trace] Found ${sessions.length} session(s):`)
    console.log('')
    for (const session of sessions) {
      console.log(`  ${session.id}`)
      console.log(`    Date: ${session.date}`)
      console.log(`    Model: ${session.model}`)
      console.log(`    Turns: ${session.turns}`)
      console.log(`    Tokens: ${session.totalInputTokens + session.totalOutputTokens}`)
      console.log('')
    }
  } catch (error: any) {
    console.error(`[trace] Failed to list: ${error.message}`)
    process.exit(1)
  }
}
