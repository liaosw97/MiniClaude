import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerPendingLSPDiagnostic,
  checkForLSPDiagnostics,
  clearAllLSPDiagnostics,
  resetAllLSPDiagnosticState,
  clearDeliveredDiagnosticsForFile,
  getPendingLSPDiagnosticCount,
} from '../../../src/services/lsp/LSPDiagnosticRegistry.js'

describe('LSPDiagnosticRegistry', () => {
  beforeEach(() => {
    resetAllLSPDiagnosticState()
  })

  // Scenario: LSP 通知处理
  it('注册并检索诊断', () => {
    registerPendingLSPDiagnostic({
      serverName: 'typescript',
      files: [
        {
          uri: 'file:///test.ts',
          diagnostics: [
            {
              message: 'Type error',
              severity: 'Error',
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 5 },
              },
            },
          ],
        },
      ],
    })

    expect(getPendingLSPDiagnosticCount()).toBe(1)

    const results = checkForLSPDiagnostics()
    expect(results).toHaveLength(1)
    expect(results[0].serverName).toBe('typescript')
    expect(results[0].files).toHaveLength(1)
    expect(results[0].files[0].diagnostics[0].message).toBe('Type error')
  })

  it('返回空数组当无待处理诊断', () => {
    const results = checkForLSPDiagnostics()
    expect(results).toEqual([])
  })

  it('去重相同诊断', () => {
    const diagnostic = {
      message: 'Duplicate error',
      severity: 'Error',
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 },
      },
    }

    registerPendingLSPDiagnostic({
      serverName: 'ts1',
      files: [{ uri: 'file:///test.ts', diagnostics: [diagnostic] }],
    })
    registerPendingLSPDiagnostic({
      serverName: 'ts2',
      files: [{ uri: 'file:///test.ts', diagnostics: [diagnostic] }],
    })

    const results = checkForLSPDiagnostics()
    const totalDiags = results.reduce(
      (sum, r) => sum + r.files.reduce((s, f) => s + f.diagnostics.length, 0),
      0,
    )
    expect(totalDiags).toBe(1)
  })

  it('跨轮次去重 — 已交付的诊断不再返回', () => {
    const diagnostic = {
      message: 'Persistent error',
      severity: 'Warning',
      range: {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 10 },
      },
    }

    // First delivery
    registerPendingLSPDiagnostic({
      serverName: 'ts',
      files: [{ uri: 'file:///test.ts', diagnostics: [diagnostic] }],
    })
    checkForLSPDiagnostics()

    // Same diagnostic again
    registerPendingLSPDiagnostic({
      serverName: 'ts',
      files: [{ uri: 'file:///test.ts', diagnostics: [diagnostic] }],
    })
    const results = checkForLSPDiagnostics()
    expect(results).toEqual([])
  })

  it('清除待处理诊断', () => {
    registerPendingLSPDiagnostic({
      serverName: 'ts',
      files: [
        {
          uri: 'file:///test.ts',
          diagnostics: [
            {
              message: 'error',
              severity: 'Error',
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 },
              },
            },
          ],
        },
      ],
    })

    clearAllLSPDiagnostics()
    expect(getPendingLSPDiagnosticCount()).toBe(0)
    expect(checkForLSPDiagnostics()).toEqual([])
  })

  it('清除指定文件的已交付诊断', () => {
    const diagnostic = {
      message: 'Edit me',
      severity: 'Error',
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 },
      },
    }

    // Deliver once
    registerPendingLSPDiagnostic({
      serverName: 'ts',
      files: [{ uri: 'file:///test.ts', diagnostics: [diagnostic] }],
    })
    checkForLSPDiagnostics()

    // Clear delivered for this file
    clearDeliveredDiagnosticsForFile('file:///test.ts')

    // Same diagnostic should now be delivered again
    registerPendingLSPDiagnostic({
      serverName: 'ts',
      files: [{ uri: 'file:///test.ts', diagnostics: [diagnostic] }],
    })
    const results = checkForLSPDiagnostics()
    expect(results).toHaveLength(1)
  })

  it('按严重性排序 — Error 在前', () => {
    registerPendingLSPDiagnostic({
      serverName: 'ts',
      files: [
        {
          uri: 'file:///test.ts',
          diagnostics: [
            {
              message: 'hint',
              severity: 'Hint',
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 },
              },
            },
            {
              message: 'error',
              severity: 'Error',
              range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 1 },
              },
            },
            {
              message: 'warning',
              severity: 'Warning',
              range: {
                start: { line: 2, character: 0 },
                end: { line: 2, character: 1 },
              },
            },
          ],
        },
      ],
    })

    const results = checkForLSPDiagnostics()
    const diags = results[0].files[0].diagnostics
    expect(diags[0].severity).toBe('Error')
    expect(diags[1].severity).toBe('Warning')
    expect(diags[2].severity).toBe('Hint')
  })

  it('限制每个文件最多 10 个诊断', () => {
    const diagnostics = Array.from({ length: 15 }, (_, i) => ({
      message: `error ${i}`,
      severity: 'Error' as const,
      range: {
        start: { line: i, character: 0 },
        end: { line: i, character: 1 },
      },
    }))

    registerPendingLSPDiagnostic({
      serverName: 'ts',
      files: [{ uri: 'file:///test.ts', diagnostics }],
    })

    const results = checkForLSPDiagnostics()
    expect(results[0].files[0].diagnostics.length).toBeLessThanOrEqual(10)
  })
})
