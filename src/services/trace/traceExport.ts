import { getSessionTrace } from './traceStore.js'

export function formatAsJsonl(records: any[]): string {
  return records.map(r => JSON.stringify(r)).join('\n') + '\n'
}

const LOG_CONTENT_MAX_LENGTH = 200

export function formatAsLog(records: any[]): string {
  const lines: string[] = []
  for (const r of records) {
    const ts = new Date(r.timestamp || Date.now()).toISOString()
    lines.push(`--- Turn ${r.turn || '?'} @ ${ts} ---`)
    const messages = r.request?.body?.messages || []
    for (const m of messages) {
      const role = m.role || 'unknown'
      const content = typeof m.content === 'string'
        ? m.content.slice(0, LOG_CONTENT_MAX_LENGTH) + (m.content.length > LOG_CONTENT_MAX_LENGTH ? '...' : '')
        : JSON.stringify(m.content).slice(0, LOG_CONTENT_MAX_LENGTH)
      lines.push(`[${role}] ${content}`)
    }
    if (r.response?.body) {
      const body = r.response.body
      lines.push(`[response] model=${body.model || '?'}, tokens=${JSON.stringify(body.usage || {})}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

export async function traceExport(
  sessionId: string,
  outputPath?: string,
  format: 'html' | 'jsonl' | 'log' = 'html',
  configDir?: string
): Promise<string> {
  const records = await getSessionTrace(sessionId, configDir)
  if (!records || records.length === 0) {
    return '未找到指定会话'
  }

  let content: string
  switch (format) {
    case 'jsonl':
      content = formatAsJsonl(records)
      break
    case 'log':
      content = formatAsLog(records)
      break
    default:
      return 'html 格式需通过 trace export <file> 命令使用，请使用文件路径而非会话 ID'
  }

  // 写入文件或将内容返回给调用方
  if (outputPath) {
    const fs = await import('fs/promises')
    await fs.writeFile(outputPath, content, 'utf-8')
    return `已导出到 ${outputPath}`
  }

  return content
}