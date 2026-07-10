/**
 * Polyfills for Bun-specific modules.
 * These are used during Node.js builds to replace bun:* imports.
 */

// bun:bundle feature() - already handled by src/compat/features.ts
export { feature } from '../features.js';

// bun:globals polyfills
export const Bun = {
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  file: (path: string) => ({
    text: () => import('fs').then(fs => fs.promises.readFile(path, 'utf-8')),
    json: () => import('fs').then(fs => fs.promises.readFile(path, 'utf-8')).then(JSON.parse),
    arrayBuffer: () => import('fs').then(fs => fs.promises.readFile(path)).then(b => b.buffer),
  }),
  spawn: async (cmd: string, args?: string[]) => {
    const { spawn } = await import('child_process');
    return spawn(cmd, args, { stdio: 'pipe' });
  },
};

// bun:ffi - placeholder (P3, out of scope)
export const dlopen = () => {
  throw new Error('bun:ffi is not supported in Node.js mode. Use N-API instead.');
};

// bun:sqlite - placeholder (P2, out of scope)
export const Database = class {
  constructor() {
    throw new Error('bun:sqlite is not supported in Node.js mode. Use better-sqlite3 instead.');
  }
};
