import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = join(process.cwd(), 'dist');
const nodeBundle = join(DIST_DIR, 'miniclaude-node.js');

// Skip if dist doesn't exist and not in CI
const shouldSkip = !existsSync(nodeBundle) && !process.env.CI;

describe.skipIf(shouldSkip)('Offline packaging script', () => {
  beforeAll(() => {
    // Ensure Node.js bundle exists
    if (!existsSync(nodeBundle)) {
      execSync('bun run build:node', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }
  }, 300000);

  it('should have a pack:offline script in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    expect(pkg.scripts['pack:offline']).toBeDefined();
    expect(pkg.scripts['pack:offline']).toContain('pack-offline');
  });

  it('should create offline package at dist/miniclaude-1.0.0.tgz', { timeout: 600000 }, () => {
    execSync('bun run pack:offline', {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    const tgzPath = join(DIST_DIR, 'miniclaude-1.0.0.tgz');
    expect(existsSync(tgzPath)).toBe(true);
  });

  it('should create a package with reasonable size', () => {
    const tgzPath = join(DIST_DIR, 'miniclaude-1.0.0.tgz');
    const stats = statSync(tgzPath);
    // Package should be between 1MB and 200MB
    expect(stats.size).toBeGreaterThan(1024 * 1024);
    expect(stats.size).toBeLessThan(200 * 1024 * 1024);
  });
});
