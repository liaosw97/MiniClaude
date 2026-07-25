// src/services/trace/runtime/timers.ts

/**
 * setImmediate 的运行时兼容版本
 * Deno 不支持 setImmediate，回退到 setTimeout(fn, 0)
 * 返回 { clear } 统一清除接口，与 setIntervalSafe 一致
 */
export function setImmediateSafe(fn: () => void): { clear: () => void } {
  if (typeof setImmediate !== 'undefined') {
    const id = setImmediate(fn)
    return { clear: () => clearImmediate(id) }
  } else {
    const id = setTimeout(fn, 0)
    return { clear: () => clearTimeout(id) }
  }
}

/**
 * setInterval 的封装，返回统一清除接口
 */
export function setIntervalSafe(fn: () => void, ms: number): { clear: () => void } {
  const id = setInterval(fn, ms)
  return { clear: () => clearInterval(id) }
}

/**
 * clearInterval 安全调用
 */
export function clearIntervalSafe(handle: { clear: () => void } | undefined): void {
  handle?.clear()
}