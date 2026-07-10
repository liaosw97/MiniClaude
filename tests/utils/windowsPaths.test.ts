import { describe, it, expect } from 'vitest'
import { windowsPathToPosixPath, posixPathToWindowsPath } from '../../src/utils/windowsPaths'

describe('windowsPathToPosixPath', () => {
  it('反斜杠 → 正斜杠（POSIX 格式）', () => {
    const result = windowsPathToPosixPath('C:\\Users\\test')
    expect(result).toContain('/')
    expect(result).not.toContain('\\')
  })

  it('混合斜杠 → 全部正斜杠', () => {
    const result = windowsPathToPosixPath('C:\\Users/test\\file')
    expect(result).not.toContain('\\')
  })
})

describe('posixPathToWindowsPath', () => {
  it('正斜杠 → 反斜杠', () => {
    expect(posixPathToWindowsPath('C:/Users/test')).toBe('C:\\Users\\test')
  })

  it('已经是反斜杠 → 不变', () => {
    expect(posixPathToWindowsPath('C:\\Users\\test')).toBe('C:\\Users\\test')
  })
})
