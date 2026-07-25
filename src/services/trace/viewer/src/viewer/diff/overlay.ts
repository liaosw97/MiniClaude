/**
 * Diff overlay 管理 — 创建/销毁 diff modal，处理 Escape 关闭
 *
 * 确保 overlay 关闭时清理 Escape 事件监听器，防止内存泄漏。
 */

// ─── 状态管理 ─────────────────────────────────────────────────────────────────

let activeOverlay: HTMLElement | null = null
let escapeHandler: ((e: KeyboardEvent) => void) | null = null

// ─── 公开 API ─────────────────────────────────────────────────────────────────

/**
 * 显示 diff overlay
 * @param content overlay 内部 HTML 内容
 * @returns 创建的 overlay 元素
 */
export function showDiffOverlay(content: string): HTMLElement {
  // 先关闭已有的 overlay
  closeDiffOverlay()

  const overlay = document.createElement('div')
  overlay.className = 'diff-overlay'
  overlay.innerHTML = `
    <div class="diff-modal">
      <div class="diff-header">
        <h3>Diff View</h3>
        <button class="diff-close-btn" title="Close (Esc)">✕</button>
      </div>
      <div class="diff-section">
        ${content}
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  activeOverlay = overlay

  // 关闭按钮事件
  const closeBtn = overlay.querySelector('.diff-close-btn')
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDiffOverlay)
  }

  // 点击背景关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDiffOverlay()
    }
  })

  // Escape 关闭 — 确保只注册一次
  escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDiffOverlay()
    }
  }
  document.addEventListener('keydown', escapeHandler)

  return overlay
}

/**
 * 关闭 diff overlay
 * 清理所有事件监听器
 */
export function closeDiffOverlay(): void {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
    escapeHandler = null
  }

  if (activeOverlay) {
    activeOverlay.remove()
    activeOverlay = null
  }
}

/**
 * 获取当前活跃的 overlay
 */
export function getActiveOverlay(): HTMLElement | null {
  return activeOverlay
}