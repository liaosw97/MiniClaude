import { describe, it, expect, vi } from 'vitest'
import { writeToStdout, writeToStderr } from '../../src/utils/process'

describe('writeToStdout', () => {
  it('写入 stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    writeToStdout('hello')
    expect(spy).toHaveBeenCalledWith('hello')
    spy.mockRestore()
  })

  it('stream 已销毁 → 不写入', () => {
    const original = process.stdout.destroyed
    vi.spyOn(process.stdout, 'destroyed', 'get').mockReturnValue(true)
    const spy = vi.spyOn(process.stdout, 'write')
    writeToStdout('hello')
    expect(spy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})

describe('writeToStderr', () => {
  it('写入 stderr', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    writeToStderr('hello')
    expect(spy).toHaveBeenCalledWith('hello')
    spy.mockRestore()
  })
})
