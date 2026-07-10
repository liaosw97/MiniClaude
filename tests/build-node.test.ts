import { describe, it, expect, afterAll } from 'vitest'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

const miniClaudeDir = join(import.meta.dirname, '..')
const metafilePath = join(miniClaudeDir, 'dist', 'metafile.json')

afterAll(() => {
  if (existsSync(metafilePath)) {
    unlinkSync(metafilePath)
  }
})

describe('build-node --metafile', () => {
  it('should generate metafile.json when --metafile is passed', () => {
    // Clean up any previous metafile before test
    if (existsSync(metafilePath)) {
      unlinkSync(metafilePath)
    }

    const stdout = execSync('bun run build:node --metafile', {
      cwd: miniClaudeDir,
      encoding: 'utf-8',
    })

    expect(stdout).toContain('Metafile')
    expect(existsSync(metafilePath)).toBe(true)

    // Verify metafile content is valid JSON with expected structure
    const metafile = JSON.parse(readFileSync(metafilePath, 'utf-8'))
    expect(metafile).toHaveProperty('inputs')
    expect(metafile).toHaveProperty('outputs')
    expect(Object.keys(metafile.inputs).length).toBeGreaterThan(0)
  })

  it('should NOT generate metafile.json without --metafile flag', () => {
    // Remove metafile if it exists from previous runs
    if (existsSync(metafilePath)) {
      unlinkSync(metafilePath)
    }

    // Build without --metafile
    execSync('bun run build:node', {
      cwd: miniClaudeDir,
      encoding: 'utf-8',
    })

    expect(existsSync(metafilePath)).toBe(false)
  })
})
