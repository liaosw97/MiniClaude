import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const OUTFILE = join(process.cwd(), 'dist', 'miniclaude-node.js');

// Skip if dist doesn't exist and not in CI
const shouldSkip = !existsSync(OUTFILE) && !process.env.CI;

describe.skipIf(shouldSkip)('dependency integration in Node.js', () => {
  beforeAll(() => {
    // Ensure the Node.js bundle exists
    if (!existsSync(OUTFILE)) {
      execSync('bun run build:node', { cwd: process.cwd(), stdio: 'pipe' });
    }
  }, 300000);

  it('should load the Node.js bundle without module errors', () => {
    // Use node --check to verify syntax
    expect(() => {
      execSync(`node --check "${OUTFILE}"`, { stdio: 'pipe' });
    }).not.toThrow();
  });

  it('should not contain unresolved bun: imports in the bundle', () => {
    const content = readFileSync(OUTFILE, 'utf-8');

    // The bundle should not have bare bun: imports
    const bunImportRegex = /from\s+["']bun:[^"']+["']/g;
    const matches = content.match(bunImportRegex);
    expect(matches).toBeNull();
  });

  it('should contain feature flag logic', () => {
    const content = readFileSync(OUTFILE, 'utf-8');
    // Check for BUN_BYTECODE (minified or not)
    expect(content).toMatch(/BUN_BYTECODE/);
  });

  it('should have NODE_COMPAT feature flag set to true', () => {
    const content = readFileSync(OUTFILE, 'utf-8');
    // Check for NODE_COMPAT:true or NODE_COMPAT:!0 (minified)
    expect(content).toMatch(/NODE_COMPAT[:\s]*[!]*true|NODE_COMPAT[:\s]*!0/);
  });

  it('should have BUN_BYTECODE feature flag set to false', () => {
    const content = readFileSync(OUTFILE, 'utf-8');
    // Check for BUN_BYTECODE:false or BUN_BYTECODE:!1 (minified)
    expect(content).toMatch(/BUN_BYTECODE[:\s]*false|BUN_BYTECODE[:\s]*!1/);
  });
});
