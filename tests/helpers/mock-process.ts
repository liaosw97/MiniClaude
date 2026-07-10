import { vi } from 'vitest'

/**
 * 创建 execa mock 实例。
 * 在测试文件中使用时，需要在文件顶部声明：
 *
 * ```ts
 * const mock = createMockProcess()
 * vi.mock('execa', () => ({ execa: mock.mockExecaFn }))
 * import { execa } from 'execa'
 * ```
 */
export function createMockProcess() {
  const mockExecaFn = vi.fn()

  return {
    mockExecaFn,
    mockExeca(stdout: string, exitCode = 0) {
      mockExecaFn.mockResolvedValue({
        stdout,
        stderr: '',
        exitCode,
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false,
      } as any)
    },
    mockExecaError(stderr: string, exitCode = 1) {
      const error: any = new Error(stderr)
      error.stderr = stderr
      error.exitCode = exitCode
      error.failed = true
      mockExecaFn.mockRejectedValue(error)
    },
    mockExecaTimeout() {
      const error: any = new Error('Command timed out')
      error.timedOut = true
      error.exitCode = -1
      mockExecaFn.mockRejectedValue(error)
    },
    clearProcessMocks() {
      mockExecaFn.mockReset()
    },
  }
}
