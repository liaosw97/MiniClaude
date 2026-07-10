/**
 * DOM 工具函数
 */

/**
 * 选择器简写
 */
export function $(selector: string, parent: Element | Document = document): Element | null {
  return parent.querySelector(selector)
}

/**
 * 选择多个元素
 */
export function $$(selector: string, parent: Element | Document = document): Element[] {
  return Array.from(parent.querySelectorAll(selector))
}

/**
 * HTML 转义
 */
export function esc(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback for older browsers
    fallbackCopyText(text)
  }
}

/**
 * Fallback 复制（不安全上下文）
 */
function fallbackCopyText(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
  } catch {
    console.error('Failed to copy text')
  }
  document.body.removeChild(textarea)
}

/**
 * 创建元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value)
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child))
      } else {
        el.appendChild(child)
      }
    }
  }
  return el
}

/**
 * 防抖
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}
