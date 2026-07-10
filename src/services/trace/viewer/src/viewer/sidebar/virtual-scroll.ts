/**
 * 虚拟滚动 — 大量条目的高性能滚动
 *
 * 仅渲染可见区域的条目（不超过 50 个 DOM 节点），
 * 避免大量 DOM 节点导致的性能问题。
 */

import type { TraceEntry } from '../../shared/types'

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 虚拟滚动配置 */
export interface VirtualScrollConfig {
  /** 每个条目的高度（像素） */
  itemHeight: number
  /** 可见区域外的缓冲条目数 */
  overscan: number
  /** 最大渲染条目数 */
  maxRenderItems: number
}

/** 虚拟滚动状态 */
interface VirtualScrollState {
  container: HTMLElement | null
  viewport: HTMLElement | null
  entries: TraceEntry[]
  scrollTop: number
  viewportHeight: number
  config: VirtualScrollConfig
  renderItem: (entry: TraceEntry) => HTMLElement
  onSelect: (requestId: string) => void
}

// ─── 默认配置 ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: VirtualScrollConfig = {
  itemHeight: 80,
  overscan: 5,
  maxRenderItems: 50,
}

// ─── 虚拟滚动管理器 ──────────────────────────────────────────────────────────

export class VirtualScroller {
  private state: VirtualScrollState
  private renderedRange = { start: -1, end: -1 }
  private resizeObserver: ResizeObserver | null = null

  constructor(
    container: HTMLElement,
    entries: TraceEntry[],
    renderItem: (entry: TraceEntry) => HTMLElement,
    onSelect: (requestId: string) => void,
    config: Partial<VirtualScrollConfig> = {}
  ) {
    this.state = {
      container,
      viewport: null,
      entries,
      scrollTop: 0,
      viewportHeight: container.clientHeight,
      config: { ...DEFAULT_CONFIG, ...config },
      renderItem,
      onSelect,
    }

    this.init()
  }

  /**
   * 初始化虚拟滚动
   */
  private init(): void {
    const { container } = this.state
    if (!container) return

    // 创建 viewport 容器
    this.state.viewport = document.createElement('div')
    this.state.viewport.className = 'virtual-scroll-viewport'
    this.state.viewport.style.position = 'relative'
    this.state.viewport.style.overflow = 'auto'
    this.state.viewport.style.height = '100%'

    container.innerHTML = ''
    container.appendChild(this.state.viewport)

    // 监听滚动事件
    this.state.viewport.addEventListener('scroll', () => {
      this.state.scrollTop = this.state.viewport!.scrollTop
      this.render()
    })

    // 监听容器大小变化
    this.resizeObserver = new ResizeObserver(() => {
      this.state.viewportHeight = this.state.viewport!.clientHeight
      this.render()
    })
    this.resizeObserver.observe(this.state.viewport)

    // 初始渲染
    this.render()
  }

  /**
   * 计算总高度
   */
  private getTotalHeight(): number {
    return this.state.entries.length * this.state.config.itemHeight
  }

  /**
   * 计算可见范围
   */
  private getVisibleRange(): { start: number; end: number } {
    const { scrollTop, viewportHeight, config, entries } = this.state

    const start = Math.floor(scrollTop / config.itemHeight)
    const visibleCount = Math.ceil(viewportHeight / config.itemHeight)

    const startWithOverscan = Math.max(0, start - config.overscan)
    const endWithOverscan = Math.min(
      entries.length,
      start + visibleCount + config.overscan
    )

    // 限制最大渲染数量
    const maxEnd = Math.min(endWithOverscan, startWithOverscan + config.maxRenderItems)

    return {
      start: startWithOverscan,
      end: maxEnd,
    }
  }

  /**
   * 渲染可见区域
   */
  private render(): void {
    const { viewport, entries, config } = this.state
    if (!viewport) return

    const { start, end } = this.getVisibleRange()

    // 检查是否需要重新渲染
    if (start === this.renderedRange.start && end === this.renderedRange.end) {
      return
    }

    this.renderedRange = { start, end }

    // 清空 viewport
    viewport.innerHTML = ''

    // 创建 spacer 元素（撑起总高度）
    const spacer = document.createElement('div')
    spacer.style.height = `${this.getTotalHeight()}px`
    spacer.style.position = 'relative'
    viewport.appendChild(spacer)

    // 渲染可见条目
    for (let i = start; i < end; i++) {
      const entry = entries[i]
      if (!entry) continue

      const item = this.state.renderItem(entry)
      item.style.position = 'absolute'
      item.style.top = `${i * config.itemHeight}px`
      item.style.left = '0'
      item.style.right = '0'
      item.style.height = `${config.itemHeight}px`

      // 点击事件
      item.addEventListener('click', () => {
        this.state.onSelect(entry.request_id)
      })

      spacer.appendChild(item)
    }
  }

  /**
   * 更新条目列表
   */
  updateEntries(entries: TraceEntry[]): void {
    this.state.entries = entries
    this.renderedRange = { start: -1, end: -1 }
    this.render()
  }

  /**
   * 滚动到指定条目
   */
  scrollToEntry(requestId: string): void {
    const index = this.state.entries.findIndex(e => e.request_id === requestId)
    if (index === -1) return

    const { viewport, config } = this.state
    if (!viewport) return

    const targetScrollTop = index * config.itemHeight
    viewport.scrollTop = targetScrollTop
  }

  /**
   * 销毁虚拟滚动
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    const { container } = this.state
    if (container) {
      container.innerHTML = ''
    }
  }
}

// ─── 便捷函数 ─────────────────────────────────────────────────────────────────

/**
 * 初始化侧边栏虚拟滚动
 */
export function vsInitSidebar(
  container: HTMLElement,
  entries: TraceEntry[],
  renderItem: (entry: TraceEntry) => HTMLElement,
  onSelect: (requestId: string) => void
): VirtualScroller {
  return new VirtualScroller(container, entries, renderItem, onSelect)
}

/**
 * 渲染可见区域（用于外部调用）
 */
export function vsRenderVisible(scroller: VirtualScroller): void {
  // 虚拟滚动器会自动处理渲染
  // 此函数保留用于兼容性
}

/**
 * 更新虚拟滚动条目
 */
export function vsUpdateEntries(
  scroller: VirtualScroller,
  entries: TraceEntry[]
): void {
  scroller.updateEntries(entries)
}

/**
 * 滚动到指定条目
 */
export function vsScrollToEntry(
  scroller: VirtualScroller,
  requestId: string
): void {
  scroller.scrollToEntry(requestId)
}
