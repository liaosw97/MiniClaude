/**
 * 主题管理 — 亮色/暗色切换
 */

const THEME_KEY = 'claude-tap-theme'

type Theme = 'light' | 'dark'

/**
 * 获取当前主题
 */
export function getTheme(): Theme {
  return (document.documentElement.getAttribute('data-theme') as Theme) || 'light'
}

/**
 * 初始化主题
 */
export function initTheme(): void {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved)
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark')
  } else {
    applyTheme('light')
  }
}

/**
 * 切换主题
 */
export function toggleTheme(): void {
  const current = getTheme()
  applyTheme(current === 'dark' ? 'light' : 'dark')
}

/**
 * 应用主题
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(THEME_KEY, theme)

  // 更新切换按钮图标
  const btn = document.getElementById('theme-toggle')
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙'
    btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  }
}
