/**
 * Viewer HTML 模板生成
 */

import { VIEWER_CSS } from './styles/viewer'

/**
 * 生成 viewer HTML
 */
export function generateViewerHtml(css: string, js: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>claude-tap Viewer</title>
<style>
${css}
</style>
</head>
<body>
<div class="header">
  <span class="logo">claude-tap</span>
  <div id="path-filter" class="path-filter"></div>
  <div id="stats" class="stats"></div>
  <div id="viewer-actions" class="viewer-actions"></div>
  <button id="theme-toggle" class="theme-toggle" title="Toggle theme"><span class="theme-icon"></span></button>
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
</div>
<script>
${js}
</script>
</body>
</html>`
}
