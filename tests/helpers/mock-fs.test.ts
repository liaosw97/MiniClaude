import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises')

import fs from 'fs/promises'
import { mockReadFile, mockReadFileError, mockWriteFile, mockAccess, clearFsMocks } from './mock-fs'

describe('mock-fs', () => {
  beforeEach(() => {
    clearFsMocks()
  })

  it('mockReadFile → 设置 readFile 返回值', async () => {
    mockReadFile('hello')
    const result = await fs.readFile('test.txt', 'utf-8')
    expect(result).toBe('hello')
  })

  it('mockReadFileError → 设置 readFile 抛出错误', async () => {
    mockReadFileError('ENOENT')
    await expect(fs.readFile('missing.txt', 'utf-8')).rejects.toEqual({ code: 'ENOENT' })
  })

  it('mockWriteFile → 设置 writeFile 成功', async () => {
    mockWriteFile()
    await expect(fs.writeFile('test.txt', 'data')).resolves.toBeUndefined()
  })

  it('mockAccess true → 文件存在', async () => {
    mockAccess(true)
    await expect(fs.access('test.txt')).resolves.toBeUndefined()
  })

  it('mockAccess false → 文件不存在', async () => {
    mockAccess(false)
    await expect(fs.access('missing.txt')).rejects.toEqual({ code: 'ENOENT' })
  })
})
