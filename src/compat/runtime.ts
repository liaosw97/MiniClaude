export type Runtime = 'bun' | 'node' | 'unknown';

export function detectRuntime(): Runtime {
  // Check for Bun first (Bun also has process.versions.node)
  if (typeof globalThis.Bun !== 'undefined') return 'bun';
  if (typeof process !== 'undefined' && process.versions?.node) return 'node';
  return 'unknown';
}

export const runtime: Runtime = detectRuntime();
export const isBun: boolean = runtime === 'bun';
export const isNode: boolean = runtime === 'node';
