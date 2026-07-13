/**
 * Trace Viewer 构建脚本
 * 将 TypeScript 模块打包为自包含 HTML 文件
 *
 * Usage:
 *   bun run build-viewer.ts          # 单次构建
 *   bun run build-viewer.ts --watch  # 监听模式，文件变化时自动重建
 */

import { build, type BuildOutput } from 'bun'
import { build as esbuildBuild } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import chokidar from 'chokidar'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, 'dist')
const SRC_DIR = join(__dirname, 'src')

/**
 * 读取 CSS 文件并合并
 */
function readCssFiles(...paths: string[]): string {
  return paths
    .map(p => readFileSync(join(SRC_DIR, p), 'utf-8'))
    .join('\n\n')
}

/**
 * 组装自包含 HTML
 */
function assembleHtml(options: {
  css: string
  js: string
  title: string
  body: string
  headScripts?: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${options.title}</title>
<style>
${options.css}
</style>
${options.headScripts ? `<script>${options.headScripts}</script>` : ''}
</head>
<body>
${options.body}
<script>
${options.js}
</script>
</body>
</html>`
}

/**
 * 构建 JS bundle
 */
async function buildJs(entrypoint: string): Promise<string> {
  if (typeof Bun === 'undefined') {
    // Node.js 路径：使用 esbuild
    const result = await esbuildBuild({
      entryPoints: [join(SRC_DIR, entrypoint)],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      minify: false,
      write: false,
    })
    if (result.errors.length > 0) {
      throw new Error(`Build failed: ${result.errors.map(e => e.text).join('\n')}`)
    }
    const output = result.outputFiles[0]
    if (!output) {
      throw new Error('No output generated')
    }
    return output.text
  }

  // Bun 路径（原始代码不变）
  const result = await build({
    entrypoints: [join(SRC_DIR, entrypoint)],
    target: 'browser',
    format: 'esm',
    minify: false,
    bundle: true,
  })

  if (!result.success) {
    throw new Error(`Build failed: ${result.logs.map(l => l.message).join('\n')}`)
  }

  const output = result.outputs[0]
  if (!output) {
    throw new Error('No output generated')
  }

  return await output.text()
}

/**
 * 生成 viewer HTML 模板
 */
function generateViewerBody(): string {
  return `<div class="header">
  <span class="logo">claude-tap</span>
  <div id="path-filter" class="path-filter"></div>
  <div id="stats" class="stats"></div>
  <div id="viewer-actions" class="viewer-actions"></div>
  <button id="theme-toggle" class="theme-toggle" title="Toggle theme">🌓</button>
  <select id="lang-select" class="lang-select"></select>
</div>
<div id="trace-path-bar" class="trace-path-bar"></div>
<div id="global-search-overlay" class="global-search-overlay" style="display:none">
  <div class="global-search-box">
    <input id="global-search-input" type="text" placeholder="Search..." />
    <span id="global-search-count"></span>
    <button id="global-search-prev">▲</button>
    <button id="global-search-next">▼</button>
    <button id="global-search-close">✕</button>
  </div>
</div>
<div id="drop-zone" class="drop-zone waiting">
  <div class="drop-zone-inner">
    <div class="drop-icon">Trace</div>
    <p>Drop .jsonl file here or wait for live traces</p>
    <div class="drop-hint">Supports drag-and-drop of JSONL trace files</div>
  </div>
</div>
<div class="main" id="main-area" style="display:none">
  <div id="sidebar-wrap" class="sidebar-wrap">
    <div id="date-picker" class="date-picker"></div>
    <input id="search-input" class="search-input" type="text" placeholder="Search..." />
    <div id="sidebar-sort" class="sidebar-sort"></div>
    <div id="tool-filter" class="tool-filter"></div>
    <div id="position-indicator" class="position-indicator"></div>
    <div id="sidebar" class="sidebar"></div>
  </div>
  <div id="detail" class="detail"></div>
</div>
<div id="mobile-back-btn" class="mobile-back-btn" style="display:none">← Back</div>
<div id="mobile-nav-bar" class="mobile-nav-bar" style="display:none">
  <button id="mobile-prev">◀</button>
  <button id="mobile-next">▶</button>
</div>`
}

/**
 * 生成 dashboard HTML 模板
 */
function generateDashboardBody(): string {
  return `<div class="header">
  <span class="logo">claude-tap dashboard</span>
  <div id="agent-chips" class="agent-chips"></div>
  <div id="stats" class="stats"></div>
  <button id="theme-toggle" class="theme-toggle" title="Toggle theme">🌓</button>
  <select id="lang-select" class="lang-select"></select>
</div>
<div class="control-panel">
  <input id="search-input" type="text" placeholder="Search sessions..." />
  <select id="status-filter">
    <option value="">All statuses</option>
    <option value="active">Active</option>
    <option value="completed">Completed</option>
  </select>
  <button id="refresh-btn">Refresh</button>
</div>
<div id="overview" class="overview-card"></div>
<div id="session-list" class="session-table"></div>
<div id="detail" class="detail" style="display:none"></div>`
}

/**
 * 构建 viewer
 */
async function buildViewer(): Promise<void> {
  console.log('Building viewer...')

  // 创建 dist 目录
  mkdirSync(DIST_DIR, { recursive: true })

  // 读取 CSS
  const viewerCss = readCssFiles(
    'shared/styles/design-tokens.css',
    'shared/styles/layout.css',
    'viewer/styles/viewer.css'
  )

  const dashboardCss = readCssFiles(
    'shared/styles/design-tokens.css',
    'shared/styles/layout.css',
    'dashboard/styles/dashboard.css'
  )

  // 构建 JS（如果入口文件存在）
  let viewerJs = ''
  let dashboardJs = ''

  const viewerEntry = join(SRC_DIR, 'viewer/main.ts')
  const dashboardEntry = join(SRC_DIR, 'dashboard/main.ts')

  if (existsSync(viewerEntry)) {
    viewerJs = await buildJs('viewer/main.ts')
    console.log('  viewer JS bundled')
  } else {
    console.log('  viewer main.ts not found, using empty JS')
  }

  if (existsSync(dashboardEntry)) {
    dashboardJs = await buildJs('dashboard/main.ts')
    console.log('  dashboard JS bundled')
  } else {
    console.log('  dashboard main.ts not found, using empty JS')
  }

  // 组装 HTML
  const viewerHtml = assembleHtml({
    css: viewerCss,
    js: viewerJs,
    title: 'claude-tap Viewer',
    body: generateViewerBody(),
  })

  const dashboardHtml = assembleHtml({
    css: dashboardCss,
    js: dashboardJs,
    title: 'claude-tap Dashboard',
    body: generateDashboardBody(),
  })

  // 写入 dist
  writeFileSync(join(DIST_DIR, 'viewer.html'), viewerHtml)
  writeFileSync(join(DIST_DIR, 'dashboard.html'), dashboardHtml)
  console.log('  Written to dist/')

  // 复制到 viewer 目录（覆盖旧文件）
  copyFileSync(join(DIST_DIR, 'viewer.html'), join(__dirname, 'viewer.html'))
  copyFileSync(join(DIST_DIR, 'dashboard.html'), join(__dirname, 'dashboard.html'))
  console.log('  Copied to viewer/')

  console.log('Build complete!')
}

// ─── Watch 模式 ──────────────────────────────────────────────────────────────

/**
 * 启动 watch 模式，监听源文件变化自动重建
 */
function startWatch(): void {
  const watchPaths = [
    join(SRC_DIR, '**/*.ts'),
    join(SRC_DIR, '**/*.css'),
    join(SRC_DIR, '**/*.json'),
  ]

  console.log('Watching for changes...')
  console.log(`  Source: ${SRC_DIR}`)

  let building = false
  let pending = false

  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100 },
  })

  watcher.on('all', async (event, filePath) => {
    const relative = filePath.replace(SRC_DIR, '')
    console.log(`[${event}] ${relative}`)

    if (building) {
      pending = true
      return
    }

    building = true
    try {
      await buildViewer()
    } catch (err) {
      console.error('Rebuild failed:', err)
    } finally {
      building = false
      if (pending) {
        pending = false
        // 延迟一下再重建，避免连续触发
        setTimeout(() => buildViewer().catch(console.error), 200)
      }
    }
  })

  // 首次构建
  buildViewer().catch(err => {
    console.error('Initial build failed:', err)
    process.exit(1)
  })
}

// ─── 入口 ────────────────────────────────────────────────────────────────────

const isWatch = process.argv.includes('--watch')

if (isWatch) {
  startWatch()
} else {
  buildViewer().catch(err => {
    console.error('Build failed:', err)
    process.exit(1)
  })
}
