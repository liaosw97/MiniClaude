// src/services/trace/runtime/fs.ts
import { mkdir, appendFile, readFile, writeFile, unlink, readdir } from 'fs/promises'
import { existsSync } from 'fs'

export interface FileSystem {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  appendFile(path: string, content: string): Promise<void>
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>
  readDir(path: string): Promise<string[]>
  unlink(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}

/**
 * Bun/Node.js 文件系统适配
 */
export function createDefaultFileSystem(): FileSystem {
  return {
    async readFile(path) { return await readFile(path, 'utf-8') },
    async writeFile(path, content) { await writeFile(path, content, 'utf-8') },
    async appendFile(path, content) { await appendFile(path, content, 'utf-8') },
    async mkdir(path, opts) { await mkdir(path, opts || { recursive: true }) },
    async readDir(path) { return await readdir(path) },
    async unlink(path) { await unlink(path) },
    async exists(path) { return existsSync(path) },
  }
}

/**
 * Deno 文件系统适配
 */
export function createDenoFileSystem(): FileSystem {
  const deno = (globalThis as any).Deno
  if (deno?.readTextFile) {
    return {
      async readFile(path) { return await deno.readTextFile(path) },
      async writeFile(path, content) { await deno.writeTextFile(path, content) },
      async appendFile(path, content) { await deno.writeTextFile(path, content, { append: true }) },
      async mkdir(path, opts) { await deno.mkdir(path, opts || { recursive: true }) },
      async readDir(path) {
        const entries: string[] = []
        for await (const entry of deno.readDir(path)) entries.push(entry.name)
        return entries
      },
      async unlink(path) { await deno.remove(path) },
      async exists(path) { try { await deno.stat(path); return true } catch { return false } },
    }
  }
  return createDefaultFileSystem()
}

import { detectRuntime } from '../../../compat/runtime.js'

let _fileSystem: FileSystem | null = null

export function getFileSystem(): FileSystem {
  if (!_fileSystem) {
    _fileSystem = detectRuntime() === 'deno' ? createDenoFileSystem() : createDefaultFileSystem()
  }
  return _fileSystem
}

export function resetFileSystem(): void {
  _fileSystem = null
}
