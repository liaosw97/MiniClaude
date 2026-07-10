import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ToolPermissionContext } from '../../../src/Tool.js'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  stat: vi.fn(),
}))

// Mock path utils
vi.mock('../../../src/utils/path.js', () => ({
  expandPath: vi.fn((p: string) => p),
}))

// Mock permissions filesystem
vi.mock('../../../src/utils/permissions/filesystem.js', () => ({
  allWorkingDirectories: vi.fn(() => []),
  pathInWorkingPath: vi.fn(() => false),
}))

// Mock errors
vi.mock('../../../src/utils/errors.js', () => ({
  getErrnoCode: vi.fn((e: any) => e?.code),
}))

import { stat } from 'fs/promises'
import {
  validateDirectoryForWorkspace,
  addDirHelpMessage,
} from '../../../src/commands/add-dir/validation.js'

const mockStat = vi.mocked(stat)

const emptyPermissionContext = {
  allowedTools: [],
  deniedTools: [],
  additionalWorkingDirectories: [],
} as unknown as ToolPermissionContext

describe('validateDirectoryForWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Scenario: /add-dir 命令 — 有效路径
  it('返回 success 当路径存在且是目录', async () => {
    mockStat.mockResolvedValue({ isDirectory: () => true } as any)

    const result = await validateDirectoryForWorkspace(
      '/valid/path',
      emptyPermissionContext,
    )

    expect(result.resultType).toBe('success')
    expect(result).toHaveProperty('absolutePath')
  })

  // Scenario: /add-dir 命令 — 无效路径
  it('返回 emptyPath 当路径为空', async () => {
    const result = await validateDirectoryForWorkspace(
      '',
      emptyPermissionContext,
    )

    expect(result.resultType).toBe('emptyPath')
  })

  it('返回 pathNotFound 当路径不存在 (ENOENT)', async () => {
    const error = new Error('ENOENT') as any
    error.code = 'ENOENT'
    mockStat.mockRejectedValue(error)

    const result = await validateDirectoryForWorkspace(
      '/nonexistent',
      emptyPermissionContext,
    )

    expect(result.resultType).toBe('pathNotFound')
    expect(result).toHaveProperty('directoryPath', '/nonexistent')
  })

  it('返回 pathNotFound 当权限不足 (EACCES)', async () => {
    const error = new Error('EACCES') as any
    error.code = 'EACCES'
    mockStat.mockRejectedValue(error)

    const result = await validateDirectoryForWorkspace(
      '/forbidden',
      emptyPermissionContext,
    )

    expect(result.resultType).toBe('pathNotFound')
  })

  it('返回 notADirectory 当路径是文件', async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false } as any)

    const result = await validateDirectoryForWorkspace(
      '/file.txt',
      emptyPermissionContext,
    )

    expect(result.resultType).toBe('notADirectory')
    expect(result).toHaveProperty('directoryPath', '/file.txt')
  })

  it('返回 alreadyInWorkingDirectory 当路径已在工作区', async () => {
    mockStat.mockResolvedValue({ isDirectory: () => true } as any)

    const { allWorkingDirectories, pathInWorkingPath } = await import(
      '../../../src/utils/permissions/filesystem.js'
    )
    vi.mocked(allWorkingDirectories).mockReturnValue(['/existing'])
    vi.mocked(pathInWorkingPath).mockReturnValue(true)

    const result = await validateDirectoryForWorkspace(
      '/existing/subdir',
      emptyPermissionContext,
    )

    expect(result.resultType).toBe('alreadyInWorkingDirectory')
    expect(result).toHaveProperty('workingDir', '/existing')
  })

  it('抛出未知错误当错误码不是 ENOENT/EACCES', async () => {
    const error = new Error('UNKNOWN') as any
    error.code = 'EIO'
    mockStat.mockRejectedValue(error)

    await expect(
      validateDirectoryForWorkspace('/path', emptyPermissionContext),
    ).rejects.toThrow('UNKNOWN')
  })
})

describe('addDirHelpMessage', () => {
  it('返回空路径提示', () => {
    const msg = addDirHelpMessage({ resultType: 'emptyPath' })
    expect(msg).toContain('provide a directory path')
  })

  it('返回路径未找到提示', () => {
    const msg = addDirHelpMessage({
      resultType: 'pathNotFound',
      directoryPath: '/missing',
      absolutePath: '/missing',
    })
    expect(msg).toContain('was not found')
  })

  it('返回非目录提示', () => {
    const msg = addDirHelpMessage({
      resultType: 'notADirectory',
      directoryPath: '/file.txt',
      absolutePath: '/file.txt',
    })
    expect(msg).toContain('not a directory')
  })

  it('返回已在工作区提示', () => {
    const msg = addDirHelpMessage({
      resultType: 'alreadyInWorkingDirectory',
      directoryPath: '/subdir',
      workingDir: '/existing',
    })
    expect(msg).toContain('already accessible')
  })

  it('返回成功提示', () => {
    const msg = addDirHelpMessage({
      resultType: 'success',
      absolutePath: '/new/dir',
    })
    expect(msg).toContain('Added')
  })
})
