import { readIndex, writeIndex } from './traceStore.js'
import { traceLogger } from './traceLogger.js'
import { join, dirname, sep } from 'path'
import { getTracesDir, getIndexPath } from './traceStore.js'

export async function traceReindex(configDir?: string): Promise<string> {
  const tracesDir = getTracesDir(configDir)
  const indexPath = getIndexPath(configDir)

  // 1. 备份旧索引
  try {
    const { copyFile, access } = await import('fs/promises')
    try {
      await access(indexPath)
      await copyFile(indexPath, indexPath + '.bak')
    } catch {
      // 无旧索引，跳过备份
    }
  } catch (err) {
    traceLogger.warn('Failed to backup index', err)
  }

  // 2. 扫描 JSONL 文件并去重
  let totalFiles = 0
  let skippedFiles = 0
  const sessionMap = new Map<string, any>()

  try {
    const { readdir, readFile } = await import('fs/promises')
    const entries = await readdir(tracesDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === '.' || entry.name === '..') continue
      const datePath = join(tracesDir, entry.name)

      let files: string[]
      try {
        files = await readdir(datePath)
      } catch {
        continue
      }

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue
        try {
          const content = await readFile(join(datePath, file), 'utf-8')
          const lines = content.trim().split('\n').filter(Boolean)
          if (lines.length === 0) continue

          const sessionId = file.replace('.jsonl', '')
          const firstRecord = JSON.parse(lines[0])
          const lastRecord = JSON.parse(lines[lines.length - 1])

          // 累计所有行的 token
          let totalInput = 0
          let totalOutput = 0
          let errorCount = 0
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line)
              const usage = parsed.normalized_usage || parsed.response?.body?.usage
              if (usage) {
                totalInput += usage.input_tokens || 0
                totalOutput += usage.output_tokens || 0
              }
              if (parsed.response?.status >= 400) errorCount++
            } catch {
              // skip individual parse errors
            }
          }

          if (sessionMap.has(sessionId)) {
            // 合并同一会话的跨日期数据
            const existing = sessionMap.get(sessionId)
            existing.turns += lines.length
            existing.totalInputTokens += totalInput
            existing.totalOutputTokens += totalOutput
            existing.errors += errorCount
            if (lastRecord.timestamp > existing.lastActivity) {
              existing.lastActivity = lastRecord.timestamp
              existing.date = entry.name
            }
          } else {
            sessionMap.set(sessionId, {
              id: sessionId,
              date: entry.name,
              turns: lines.length,
              totalInputTokens: totalInput,
              totalOutputTokens: totalOutput,
              lastActivity: lastRecord.timestamp || Date.now(),
              model: firstRecord.response?.body?.model || 'unknown',
              errors: errorCount,
            })
          }
          totalFiles++
        } catch {
          skippedFiles++
        }
      }
    }
  } catch (err) {
    traceLogger.warn('Failed to scan traces dir', err)
  }

  // 3. 写入新索引（使用原子写入）
  const sessions = Array.from(sessionMap.values())
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  const newIndex = { sessions }
  try {
    const { writeFile, rename, mkdir: fsMkdir } = await import('fs/promises')
    const tmpPath = indexPath + '.tmp'
    const dir = dirname(indexPath)
    await fsMkdir(dir, { recursive: true }).catch(() => {})
    await writeFile(tmpPath, JSON.stringify(newIndex, null, 2))
    await rename(tmpPath, indexPath)
  } catch (err) {
    traceLogger.error('Failed to write new index', err)
    return `重建索引失败: ${err}`
  }

  if (totalFiles === 0) {
    return '未找到 trace 文件，已创建空索引'
  }

  const skipMsg = skippedFiles > 0 ? `，跳过 ${skippedFiles} 个损坏文件` : ''
  return `重建索引完成: ${totalFiles} 个文件${skipMsg}`
}