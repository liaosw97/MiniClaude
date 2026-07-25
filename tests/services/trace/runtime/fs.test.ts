import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createDefaultFileSystem, createDenoFileSystem } from '../../../../src/services/trace/runtime/fs.js'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { mkdirSync, existsSync, writeFileSync, readFileSync, unlinkSync, rmSync } from 'fs'

function tmpDir(): string {
  const dir = join(tmpdir(), 'miniclaude-fs-test-' + randomBytes(4).toString('hex'))
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('FileSystem (default / Node.js)', () => {
  let testDir: string
  let fs: ReturnType<typeof createDefaultFileSystem>

  beforeAll(() => {
    testDir = tmpDir()
    fs = createDefaultFileSystem()
  })

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('should write and read a file', async () => {
    const filePath = join(testDir, 'hello.txt')
    await fs.writeFile(filePath, 'hello world')
    const content = await fs.readFile(filePath)
    expect(content).toBe('hello world')
  })

  it('should append to a file', async () => {
    const filePath = join(testDir, 'append.txt')
    await fs.writeFile(filePath, 'line1\n')
    await fs.appendFile(filePath, 'line2\n')
    const content = await fs.readFile(filePath)
    expect(content).toBe('line1\nline2\n')
  })

  it('should create directories recursively', async () => {
    const deepDir = join(testDir, 'a', 'b', 'c')
    await fs.mkdir(deepDir)
    expect(existsSync(deepDir)).toBe(true)
  })

  it('should check file existence', async () => {
    const filePath = join(testDir, 'exists.txt')
    expect(await fs.exists(filePath)).toBe(false)
    await fs.writeFile(filePath, '')
    expect(await fs.exists(filePath)).toBe(true)
  })

  it('should delete a file', async () => {
    const filePath = join(testDir, 'delete-me.txt')
    await fs.writeFile(filePath, 'bye')
    expect(await fs.exists(filePath)).toBe(true)
    await fs.unlink(filePath)
    expect(await fs.exists(filePath)).toBe(false)
  })

  it('should list directory contents', async () => {
    await fs.writeFile(join(testDir, 'list-a.txt'), 'a')
    await fs.writeFile(join(testDir, 'list-b.txt'), 'b')
    const entries = await fs.readDir!(testDir)
    expect(entries).toContain('list-a.txt')
    expect(entries).toContain('list-b.txt')
  })
})

describe('FileSystem (Deno fallback)', () => {
  let testDir: string

  beforeAll(() => {
    testDir = tmpDir()
  })

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('should fall back to default when Deno is not available', () => {
    const fs = createDenoFileSystem()
    expect(typeof fs.readFile).toBe('function')
    expect(typeof fs.writeFile).toBe('function')
  })

  it('deno fallback should still work correctly', async () => {
    const fs = createDenoFileSystem()
    const filePath = join(testDir, 'deno-fallback.txt')
    await fs.writeFile(filePath, 'deno fallback works')
    const content = await fs.readFile(filePath)
    expect(content).toBe('deno fallback works')
  })
})