// tests/services/trace/trace-cli-integration.test.ts
import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { sep } from 'path'
import { traceStats } from '../../../src/services/trace/traceStats.js'
import { traceReindex } from '../../../src/services/trace/traceReindex.js'

describe('trace CLI integration', () => {
  const tmpDir = mkdtempSync(tmpdir() + sep + 'trace-cli-test-')

  it('traceStats should handle empty traces dir', async () => {
    const output = await traceStats(undefined, tmpDir)
    expect(output).toContain('暂无 trace 数据')
  })

  it('traceReindex should handle empty traces dir', async () => {
    const output = await traceReindex(tmpDir)
    expect(output).toContain('未找到 trace 文件')
  })

  it('traceStats should handle non-existent session', async () => {
    const output = await traceStats('non-existent-session-id', tmpDir)
    expect(output).toContain('未找到会话')
  })
})