import { getSessionTrace, readIndex, getTracesDir } from './traceStore.js'
import { traceLogger } from './traceLogger.js'
import { join } from 'path'

export interface GlobalStats {
  totalSessions: number
  totalRequests: number
  totalTokens: number
  cacheHitRate: number
  avgResponseTime: number
}

export interface SessionStats {
  sessionId: string
  requestCount: number
  totalTokens: number
  modelDistribution: Record<string, number>
  errorCount: number
}

export async function collectGlobalStats(configDir?: string): Promise<GlobalStats> {
  const index = await readIndex(configDir)
  const sessions = index.sessions || []

  if (sessions.length === 0) {
    return { totalSessions: 0, totalRequests: 0, totalTokens: 0, cacheHitRate: 0, avgResponseTime: 0 }
  }

  let totalRequests = 0
  let totalTokens = 0
  let totalCacheHits = 0
  let totalResponseTime = 0
  let sessionsWithTime = 0

  for (const s of sessions) {
    totalRequests += s.turns || 0
    totalTokens += (s.totalInputTokens || 0) + (s.totalOutputTokens || 0)
    totalCacheHits += s.cacheHits || 0
    if (s.cacheHitRate !== undefined) {
      totalResponseTime += s.cacheHitRate
      sessionsWithTime++
    }
  }

  return {
    totalSessions: sessions.length,
    totalRequests,
    totalTokens,
    cacheHitRate: totalRequests > 0 ? totalCacheHits / totalRequests : 0,
    avgResponseTime: sessionsWithTime > 0 ? Math.round(totalResponseTime / sessionsWithTime) : 0,
  }
}

export async function collectSessionStats(sessionId: string, records?: any[]): Promise<SessionStats> {
  const modelDistribution: Record<string, number> = {}
  let totalTokens = 0
  let errorCount = 0

  for (const r of (records || [])) {
    const usage = r.normalized_usage || r.response?.body?.usage
    if (usage) {
      totalTokens += (usage.input_tokens || 0) + (usage.output_tokens || 0)
    }
    const model = r.response?.body?.model || 'unknown'
    modelDistribution[model] = (modelDistribution[model] || 0) + 1
    if (r.response?.status && r.response.status >= 400) errorCount++
  }

  return {
    sessionId,
    requestCount: (records || []).length,
    totalTokens,
    modelDistribution,
    errorCount,
  }
}

/**
 * 降级方案：当 index.json 损坏时，直接从 JSONL 文件扫描统计
 * 遍历 traces 目录下所有 JSONL 文件，收集基本统计信息
 */
async function collectStatsFromJsonl(configDir?: string): Promise<GlobalStats> {
  const tracesDir = getTracesDir(configDir)
  let totalLines = 0
  let totalInput = 0
  let totalOutput = 0
  const sessionIds = new Set<string>()

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
        sessionIds.add(file.replace('.jsonl', ''))
        try {
          const content = await readFile(join(datePath, file), 'utf-8')
          const lines = content.trim().split('\n').filter(Boolean)
          totalLines += lines.length

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line)
              const usage = parsed.normalized_usage || parsed.response?.body?.usage
              if (usage) {
                totalInput += usage.input_tokens || 0
                totalOutput += usage.output_tokens || 0
              }
            } catch {
              // skip individual parse errors
            }
          }
        } catch {
          // skip corrupt files
        }
      }
    }
  } catch {
    // traces dir not found
  }

  return {
    totalSessions: sessionIds.size,
    totalRequests: totalLines,
    totalTokens: totalInput + totalOutput,
    cacheHitRate: 0,
    avgResponseTime: 0,
  }
}

export async function traceStats(sessionId?: string, configDir?: string): Promise<string> {
  try {
    if (sessionId) {
      const records = await getSessionTrace(sessionId, configDir)
      if (!records || records.length === 0) {
        return `未找到会话 ${sessionId} 的数据`
      }
      const stats = await collectSessionStats(sessionId, records)
      return [
        `会话: ${stats.sessionId}`,
        `  请求数: ${stats.requestCount}`,
        `  总 Token: ${stats.totalTokens}`,
        `  模型分布: ${Object.entries(stats.modelDistribution).map(([m, c]) => `${m}: ${c}`).join(', ')}`,
        `  错误数: ${stats.errorCount}`,
      ].join('\n')
    }

    const global = await collectGlobalStats(configDir)
    if (global.totalSessions === 0) {
      return '暂无 trace 数据'
    }
    return [
      `全局统计概览`,
      `  总会话数: ${global.totalSessions}`,
      `  总请求数: ${global.totalRequests}`,
      `  总 Token 量: ${global.totalTokens}`,
      `  Cache 命中率: ${(global.cacheHitRate * 100).toFixed(1)}%`,
      `  平均响应时间: ${global.avgResponseTime}ms`,
    ].join('\n')
  } catch (err) {
    traceLogger.warn('index.json 可能已损坏，尝试直接从 JSONL 扫描...')
    try {
      const fallback = await collectStatsFromJsonl(configDir)
      if (fallback.totalSessions === 0) {
        return '警告: index.json 损坏且无可用 JSONL 文件，请运行 trace reindex 修复'
      }
      return [
        `全局统计概览（降级模式 — 从 JSONL 直接扫描）`,
        `  总会话数: ${fallback.totalSessions}`,
        `  总请求数: ${fallback.totalRequests}`,
        `  总 Token 量: ${fallback.totalTokens}`,
        `  (降级模式下 cache 命中率和平均响应时间不可用)`,
        `  提示: 建议运行 trace reindex 修复索引`,
      ].join('\n')
    } catch (fallbackErr) {
      traceLogger.error('JSONL 降级扫描也失败', fallbackErr)
      return '警告: index.json 损坏且 JSONL 降级扫描失败，请运行 trace reindex 修复'
    }
  }
}