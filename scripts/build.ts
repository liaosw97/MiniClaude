import { chmodSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

const pkg = await Bun.file(new URL('../package.json', import.meta.url)).json() as {
  name: string
  version: string
}

const args = process.argv.slice(2)
const compile = args.includes('--compile')
const dev = args.includes('--dev')
const buildAll = args.includes('--all')

// 解析 --target 参数
function getTargetFromArgs(): string | null {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      return args[i + 1]
    }
    if (args[i]?.startsWith('--target=')) {
      return args[i].slice('--target='.length)
    }
  }
  return null
}

const fullExperimentalFeatures = [
  'AGENT_MEMORY_SNAPSHOT',
  'AGENT_TRIGGERS',
  'AGENT_TRIGGERS_REMOTE',
  'AWAY_SUMMARY',
  'BASH_CLASSIFIER',
  'BRIDGE_MODE',
  'BUILTIN_EXPLORE_PLAN_AGENTS',
  'CACHED_MICROCOMPACT',
  'CCR_AUTO_CONNECT',
  'CCR_MIRROR',
  'CCR_REMOTE_SETUP',
  'COMPACTION_REMINDERS',
  'CONNECTOR_TEXT',
  'EXTRACT_MEMORIES',
  'HISTORY_PICKER',
  'HOOK_PROMPTS',
  'LODESTONE',
  'MCP_RICH_OUTPUT',
  'MESSAGE_ACTIONS',
  'NATIVE_CLIPBOARD_IMAGE',
  'NEW_INIT',
  'POWERSHELL_AUTO_MODE',
  'PROMPT_CACHE_BREAK_DETECTION',
  'QUICK_SEARCH',
  'SHOT_STATS',
  'TOKEN_BUDGET',
  'TREE_SITTER_BASH',
  'TREE_SITTER_BASH_SHADOW',
  'ULTRAPLAN',
  'ULTRATHINK',
  'UNATTENDED_RETRY',
  'VERIFICATION_AGENT',
] as const

function runCommand(cmd: string[]): string | null {
  const proc = Bun.spawnSync({
    cmd,
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (proc.exitCode !== 0) {
    return null
  }

  return new TextDecoder().decode(proc.stdout).trim() || null
}

function getDevVersion(baseVersion: string): string {
  const timestamp = new Date().toISOString()
  const date = timestamp.slice(0, 10).replaceAll('-', '')
  const time = timestamp.slice(11, 19).replaceAll(':', '')
  const sha = runCommand(['git', 'rev-parse', '--short=8', 'HEAD']) ?? 'unknown'
  return `${baseVersion}-dev.${date}.t${time}.sha${sha}`
}

function getVersionChangelog(): string {
  return (
    runCommand(['git', 'log', '--format=%h %s', '-20']) ??
    'Local development build'
  )
}

const defaultFeatures = []
const featureSet = new Set(defaultFeatures)
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i]
  if (arg === '--feature-set' && args[i + 1]) {
    if (args[i + 1] === 'dev-full') {
      for (const feature of fullExperimentalFeatures) {
        featureSet.add(feature)
      }
    }
    i += 1
    continue
  }
  if (arg === '--feature-set=dev-full') {
    for (const feature of fullExperimentalFeatures) {
      featureSet.add(feature)
    }
    continue
  }
  if (arg === '--feature' && args[i + 1]) {
    featureSet.add(args[i + 1]!)
    i += 1
    continue
  }
  if (arg.startsWith('--feature=')) {
    featureSet.add(arg.slice('--feature='.length))
  }
}
const features = [...featureSet]

// 支持的目标平台列表
const ALL_TARGETS: Record<string, { target: string; outfile: string }> = {
  'linux-x64': { target: 'bun-linux-x64', outfile: 'miniclaude-linux-x64' },
  'linux-arm64': { target: 'bun-linux-arm64', outfile: 'miniclaude-linux-arm64' },
  'darwin-x64': { target: 'bun-darwin-x64', outfile: 'miniclaude-darwin-x64' },
  'darwin-arm64': { target: 'bun-darwin-arm64', outfile: 'miniclaude-darwin-arm64' },
  'windows-x64': { target: 'bun-windows-x64', outfile: 'miniclaude-windows-x64.exe' },
}

// 自动检测目标平台
function detectTarget(): { target: string; outfile: string } {
  const platform = process.platform === 'win32' ? 'windows' : process.platform
  const arch = process.arch

  const key = `${platform}-${arch}`
  const result = ALL_TARGETS[key]

  if (!result) {
    console.error(`❌ Unsupported platform: ${platform}-${arch}`)
    console.error('Supported targets:', Object.keys(ALL_TARGETS).join(', '))
    process.exit(1)
  }

  return result
}

// 根据名称获取目标平台
function getTargetByName(name: string): { target: string; outfile: string } | null {
  return ALL_TARGETS[name] ?? null
}

const buildTime = new Date().toISOString()
const version = dev ? getDevVersion(pkg.version) : pkg.version

// 读取 viewer HTML 文件，嵌入到二进制中
const viewerPath = join(import.meta.dirname, '..', 'src', 'services', 'trace', 'viewer', 'viewer.html')
const dashboardPath = join(import.meta.dirname, '..', 'src', 'services', 'trace', 'viewer', 'dashboard.html')
const viewerHtmlContent = (() => {
  try { return { viewer: readFileSync(viewerPath, 'utf-8'), dashboard: readFileSync(dashboardPath, 'utf-8') } }
  catch { return { viewer: '', dashboard: '' } }
})()

// 构建单个目标平台
function buildTarget(targetName: string, targetConfig: { target: string; outfile: string }) {
  const outfile = join('./dist', targetConfig.outfile)
  mkdirSync('./dist', { recursive: true })

  const externals = [
    '@ant/*',
    'audio-capture-napi',
    'image-processor-napi',
    'modifiers-napi',
    'url-handler-napi',
  ]

  const defines = {
    'process.env.USER_TYPE': JSON.stringify('external'),
    'process.env.CLAUDE_CODE_FORCE_FULL_LOGO': JSON.stringify('true'),
    ...(dev
      ? { 'process.env.NODE_ENV': JSON.stringify('development') }
      : {}),
    ...(dev
      ? {
          'process.env.CLAUDE_CODE_EXPERIMENTAL_BUILD': JSON.stringify('true'),
        }
      : {}),
    'process.env.CLAUDE_CODE_VERIFY_PLAN': JSON.stringify('false'),
    'process.env.CCR_FORCE_BUNDLE': JSON.stringify('true'),
    'MACRO.VERSION': JSON.stringify(version),
    'MACRO.BUILD_TIME': JSON.stringify(buildTime),
    'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
    'MACRO.NATIVE_PACKAGE_URL': 'undefined',
    'MACRO.FEEDBACK_CHANNEL': JSON.stringify('github'),
    'MACRO.ISSUES_EXPLAINER': JSON.stringify(
      'This reconstructed source snapshot does not include Anthropic internal issue routing.',
    ),
    'MACRO.VERSION_CHANGELOG': JSON.stringify(
      dev ? getVersionChangelog() : 'https://github.com/paoloanzn/claude-code',
    ),
    'MACRO.VIEWER_HTML': JSON.stringify(viewerHtmlContent?.viewer ?? ''),
    'MACRO.DASHBOARD_HTML': JSON.stringify(viewerHtmlContent?.dashboard ?? ''),
  } as const

  const cmd = [
    'bun',
    'build',
    './src/entrypoints/cli.tsx',
    '--compile',
    '--bytecode',
    '--target',
    targetConfig.target,
    '--format',
    'esm',
    '--outfile',
    outfile,
    '--minify',
    '--packages',
    'bundle',
    '--conditions',
    'bun',
  ]

  for (const external of externals) {
    cmd.push('--external', external)
  }

  for (const feature of features) {
    cmd.push(`--feature=${feature}`)
  }

  for (const [key, value] of Object.entries(defines)) {
    cmd.push('--define', `${key}=${value}`)
  }

  console.log(`\n🔨 Building ${targetName}...`)
  const proc = Bun.spawnSync({
    cmd,
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (proc.exitCode !== 0) {
    console.error(`❌ Failed to build ${targetName}`)
    return false
  }

  if (existsSync(outfile)) {
    chmodSync(outfile, 0o755)
  }

  console.log(`✅ Built ${outfile}`)
  return true
}

// 主构建逻辑
if (compile) {
  if (buildAll) {
    // 打包所有平台
    console.log('📦 Building for all platforms...')
    let successCount = 0
    for (const [name, config] of Object.entries(ALL_TARGETS)) {
      if (buildTarget(name, config)) {
        successCount++
      }
    }
    console.log(`\n🎉 Built ${successCount}/${Object.keys(ALL_TARGETS).length} platforms`)
  } else {
    // 指定平台或自动检测
    const targetArg = getTargetFromArgs()
    let detected: { target: string; outfile: string }

    if (targetArg) {
      const found = getTargetByName(targetArg)
      if (!found) {
        console.error(`❌ Unknown target: ${targetArg}`)
        console.error('Available targets:', Object.keys(ALL_TARGETS).join(', '))
        process.exit(1)
      }
      detected = found
    } else {
      detected = detectTarget()
    }

    const platformName = targetArg || `${process.platform}-${process.arch}`
    buildTarget(platformName, detected)
  }
} else {
  // 非编译模式，输出 JS bundle
  const outfile = dev ? './cli' : './cli'
  const externals = [
    '@ant/*',
    'audio-capture-napi',
    'image-processor-napi',
    'modifiers-napi',
    'url-handler-napi',
  ]

  const defines = {
    'process.env.USER_TYPE': JSON.stringify('external'),
    'process.env.CLAUDE_CODE_FORCE_FULL_LOGO': JSON.stringify('true'),
    ...(dev
      ? { 'process.env.NODE_ENV': JSON.stringify('development') }
      : {}),
    ...(dev
      ? {
          'process.env.CLAUDE_CODE_EXPERIMENTAL_BUILD': JSON.stringify('true'),
        }
      : {}),
    'process.env.CLAUDE_CODE_VERIFY_PLAN': JSON.stringify('false'),
    'process.env.CCR_FORCE_BUNDLE': JSON.stringify('true'),
    'MACRO.VERSION': JSON.stringify(version),
    'MACRO.BUILD_TIME': JSON.stringify(buildTime),
    'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
    'MACRO.NATIVE_PACKAGE_URL': 'undefined',
    'MACRO.FEEDBACK_CHANNEL': JSON.stringify('github'),
    'MACRO.ISSUES_EXPLAINER': JSON.stringify(
      'This reconstructed source snapshot does not include Anthropic internal issue routing.',
    ),
    'MACRO.VERSION_CHANGELOG': JSON.stringify(
      dev ? getVersionChangelog() : 'https://github.com/paoloanzn/claude-code',
    ),
    'MACRO.VIEWER_HTML': JSON.stringify(viewerHtmlContent?.viewer ?? ''),
    'MACRO.DASHBOARD_HTML': JSON.stringify(viewerHtmlContent?.dashboard ?? ''),
  } as const

  const cmd = [
    'bun',
    'build',
    './src/entrypoints/cli.tsx',
    '--target',
    'bun',
    '--format',
    'esm',
    '--outfile',
    outfile,
    '--minify',
    '--packages',
    'bundle',
    '--conditions',
    'bun',
  ]

  for (const external of externals) {
    cmd.push('--external', external)
  }

  for (const feature of features) {
    cmd.push(`--feature=${feature}`)
  }

  for (const [key, value] of Object.entries(defines)) {
    cmd.push('--define', `${key}=${value}`)
  }

  const proc = Bun.spawnSync({
    cmd,
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (proc.exitCode !== 0) {
    process.exit(proc.exitCode ?? 1)
  }

  if (existsSync(outfile)) {
    chmodSync(outfile, 0o755)
    // 非编译模式下，Bun 输出的是 JS bundle 以 // @bun 开头。
    // 在 Windows 上，shell 无法直接执行这个 JS 会报错。
    // 需要生成一个 .cmd 包装器。
    if (process.platform === 'win32') {
      const wrapper = `@echo off
bun run "%~dp0${require('path').basename(outfile)}" %*
`
      Bun.write(outfile + '.cmd', wrapper)
      console.log(`  + Created ${outfile}.cmd wrapper for Windows`)
    }
  }

  console.log(`✅ Built ${outfile}`)
}
