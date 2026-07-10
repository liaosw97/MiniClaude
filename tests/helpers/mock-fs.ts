import { vi } from 'vitest'
import fs from 'fs/promises'

export function mockReadFile(content: string) {
  vi.mocked(fs.readFile).mockResolvedValue(content as any)
}

export function mockReadFileError(code: string) {
  vi.mocked(fs.readFile).mockRejectedValue({ code })
}

export function mockWriteFile() {
  vi.mocked(fs.writeFile).mockResolvedValue(undefined)
}

export function mockWriteFileError(code: string) {
  vi.mocked(fs.writeFile).mockRejectedValue({ code })
}

export function mockAccess(exists: boolean) {
  vi.mocked(fs.access).mockImplementation(
    exists ? () => Promise.resolve(undefined) : () => Promise.reject({ code: 'ENOENT' }),
  )
}

export function mockMkdir() {
  vi.mocked(fs.mkdir).mockResolvedValue(undefined)
}

export function mockReaddir(files: string[]) {
  vi.mocked(fs.readdir).mockResolvedValue(files as any)
}

export function mockStat(isFile: boolean) {
  vi.mocked(fs.stat).mockResolvedValue({ isFile: () => isFile } as any)
}

export function mockUnlink() {
  vi.mocked(fs.unlink).mockResolvedValue(undefined)
}

export function clearFsMocks() {
  vi.mocked(fs.readFile).mockReset()
  vi.mocked(fs.writeFile).mockReset()
  vi.mocked(fs.access).mockReset()
  vi.mocked(fs.mkdir).mockReset()
  vi.mocked(fs.readdir).mockReset()
  vi.mocked(fs.stat).mockReset()
  vi.mocked(fs.unlink).mockReset()
}
