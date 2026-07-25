export type Runtime = 'bun' | 'node' | 'deno' | 'unknown';

export function detectRuntime(): Runtime {
  if ((globalThis as any).__MOCK_RUNTIME) return (globalThis as any).__MOCK_RUNTIME as Runtime;
  if (typeof globalThis.Bun !== 'undefined') return 'bun';
  if (typeof (globalThis as any).Deno !== 'undefined') return 'deno';
  if (typeof process !== 'undefined' && process.versions?.node) return 'node';
  return 'unknown';
}

export const runtime: Runtime = detectRuntime();
export const isBun: boolean = runtime === 'bun';
export const isNode: boolean = runtime === 'node';
export const isDeno: boolean = runtime === 'deno';

/**
 * 用于测试的 mock 注入（仅测试环境使用）
 * 在 Bun 下 globalThis.Bun 是只读属性，无法直接赋值
 */
export function _setMockRuntime(mockRuntime: Runtime): void {
  (globalThis as any).__MOCK_RUNTIME = mockRuntime
}

export function _clearMockRuntime(): void {
  delete (globalThis as any).__MOCK_RUNTIME
}
