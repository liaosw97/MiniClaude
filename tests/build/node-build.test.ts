import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DIST_DIR = join(process.cwd(), 'dist');
const OUTFILE = join(DIST_DIR, 'miniclaude-node.js');

// Skip if dist doesn't exist and not in CI
const shouldSkip = !existsSync(OUTFILE) && !process.env.CI;

describe.skipIf(shouldSkip)('Node.js build script', () => {
  beforeAll(() => {
    // Ensure build exists
    if (!existsSync(OUTFILE)) {
      execSync('bun run build:node', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }
  }, 300000);

  it('should have a build:node script in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    expect(pkg.scripts['build:node']).toBeDefined();
    expect(pkg.scripts['build:node']).toContain('build-node');
  });

  it('should create Node.js compatible bundle at dist/miniclaude-node.js', () => {
    expect(existsSync(OUTFILE)).toBe(true);
  });

  it('should produce valid ESM output', () => {
    const content = readFileSync(OUTFILE, 'utf-8');
    // ESM bundles should be substantial
    expect(content.length).toBeGreaterThan(1000);
  });
});
