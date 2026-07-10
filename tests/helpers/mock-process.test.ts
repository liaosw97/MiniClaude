import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockExecaFn } = vi.hoisted(() => ({
  mockExecaFn: vi.fn(),
}))

vi.mock('execa', () => ({ execa: mockExecaFn }))

import { execa } from 'execa'

function mockExeca(stdout: string, exitCode = 0) {
  mockExecaFn.mockResolvedValue({
    stdout,
    stderr: '',
    exitCode,
    failed: false,
    timedOut: false,
    isCanceled: false,
    killed: false,
  } as any)
}

function mockExecaError(stderr: string, exitCode = 1) {
  const error: any = new Error(stderr)
  error.stderr = stderr
  error.exitCode = exitCode
  error.failed = true
  mockExecaFn.mockRejectedValue(error)
}

function mockExecaTimeout() {
  const error: any = new Error('Command timed out')
  error.timedOut = true
  error.exitCode = -1
  mockExecaFn.mockRejectedValue(error)
}

describe('mock-process', () => {
  beforeEach(() => {
    mockExecaFn.mockReset()
  })

  it('mockExeca → 设置成功执行', async () => {
    mockExeca('output')
    const result = await execa('echo', ['hello'])
    expect(result.stdout).toBe('output')
    expect(result.exitCode).toBe(0)
  })

  it('mockExeca with exitCode → 设置自定义退出码', async () => {
    mockExeca('output', 2)
    const result = await execa('cmd')
    expect(result.exitCode).toBe(2)
  })

  it('mockExecaError → 设置失败执行', async () => {
    mockExecaError('error message', 1)
    await expect(execa('cmd')).rejects.toThrow('error message')
  })

  it('mockExecaTimeout → 设置超时', async () => {
    mockExecaTimeout()
    await expect(execa('cmd')).rejects.toThrow('Command timed out')
  })
})
