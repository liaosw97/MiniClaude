import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('pack-offline', () => {
  it('should not include bulk npm install command (Phase 3 fix)', () => {
    const packScript = readFileSync(
      join(import.meta.dirname, '..', 'scripts', 'pack-offline.ts'),
      'utf-8'
    )

    // Phase 3: bulk npm install was removed — verify --omit flags are absent
    expect(packScript).not.toContain('--omit=optional')
    expect(packScript).not.toContain('--omit=dev')
    // Phase 3: only xxhash-wasm is installed individually
    expect(packScript).toContain('npm install xxhash-wasm')
  })

  it('offline package.json should not include optionalDependencies', () => {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8')
    )

    const offlinePkgDeps = Object.keys(pkg.dependencies)
    const optDeps = Object.keys(pkg.optionalDependencies || {})
    for (const dep of optDeps) {
      expect(offlinePkgDeps).not.toContain(dep)
    }
  })

  it('should generate offline package.json with empty dependencies', () => {
    const packScript = readFileSync(
      join(import.meta.dirname, '..', 'scripts', 'pack-offline.ts'),
      'utf-8'
    )

    // Phase 3: offline package.json uses dependencies: {}
    expect(packScript).toContain('dependencies: {}')
  })

  it('should set type:module in offline package.json', () => {
    const packScript = readFileSync(
      join(import.meta.dirname, '..', 'scripts', 'pack-offline.ts'),
      'utf-8'
    )

    // Phase 3 fix: offline package needs type:module for ESM imports
    expect(packScript).toContain("type: 'module'")
  })

  it('should use import() not require() in bin entry', () => {
    const packScript = readFileSync(
      join(import.meta.dirname, '..', 'scripts', 'pack-offline.ts'),
      'utf-8'
    )

    // Phase 3 fix: bin entry uses dynamic import() for ESM compatibility
    expect(packScript).toContain("import('../dist/miniclaude-node.js')")
    expect(packScript).not.toContain("require('../dist/miniclaude-node.js')")
  })
})
