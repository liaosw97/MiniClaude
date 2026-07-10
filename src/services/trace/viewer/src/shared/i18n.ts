/**
 * i18n 国际化引擎
 */

const LANG_KEY = 'claude-tap-lang'

let currentLang = 'en'
let i18nData: Record<string, Record<string, string>> = {}

/**
 * 初始化 i18n
 */
export function initI18n(data: Record<string, Record<string, string>>): void {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    // 降级：使用默认英文，标记为空数据
    i18nData = {}
    currentLang = 'en'
    return
  }

  i18nData = data
  currentLang = detectLang()
  applyI18n()
}

/**
 * 检查 i18n 数据是否为空
 */
export function isI18nEmpty(): boolean {
  return Object.keys(i18nData).length === 0
}

/**
 * 检测浏览器语言
 */
export function detectLang(): string {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved && i18nData[saved]) return saved

  const nav = navigator.language || 'en'
  if (i18nData[nav]) return nav

  const short = nav.split('-')[0]
  if (i18nData[short]) return short

  return 'en'
}

/**
 * 翻译函数
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let value = i18nData[currentLang]?.[key]
    || i18nData['en']?.[key]
    || key

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v))
    }
  }

  return value
}

/**
 * 切换语言
 */
export function setLang(lang: string): void {
  if (!i18nData[lang]) return
  currentLang = lang
  localStorage.setItem(LANG_KEY, lang)
  applyI18n()

  // RTL 支持
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

/**
 * 获取当前语言
 */
export function getLang(): string {
  return currentLang
}

/**
 * 应用 i18n 到 DOM
 */
export function applyI18n(): void {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    if (key) el.textContent = t(key)
  })

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder')
    if (key) (el as HTMLInputElement).placeholder = t(key)
  })

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title')
    if (key) el.setAttribute('title', t(key))
  })
}

/**
 * 渲染语言选择器
 */
export function renderLangSelect(selectId: string): void {
  const select = document.getElementById(selectId) as HTMLSelectElement
  if (!select) return

  select.innerHTML = ''

  // 空数据时显示默认 EN 选项
  const languages = Object.keys(i18nData)
  if (languages.length === 0) {
    const option = document.createElement('option')
    option.value = 'en'
    option.textContent = 'EN'
    option.selected = true
    select.appendChild(option)
    return
  }

  for (const lang of languages) {
    const option = document.createElement('option')
    option.value = lang
    option.textContent = lang.toUpperCase()
    option.selected = lang === currentLang
    select.appendChild(option)
  }

  select.addEventListener('change', () => setLang(select.value))
}
