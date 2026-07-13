import * as esbuild from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, dirname, isAbsolute } from 'path';

const args = process.argv.slice(2);
const dev = args.includes('--dev');
const enableMetafile = args.includes('--metafile');

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8'));
const version = pkg.version;

const buildTime = new Date().toISOString();
const srcDir = join(import.meta.dirname, '..', 'src');

// Ensure dist directory exists
const distDir = join(import.meta.dirname, '..', 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Plugin to replace bun:bundle with our compat layer
const bunBundlePlugin: esbuild.Plugin = {
  name: 'bun-bundle-compat',
  setup(build) {
    build.onResolve({ filter: /^bun:bundle$/ }, (args) => ({
      path: args.path,
      namespace: 'bun-compat',
    }));

    build.onLoad({ filter: /.*/, namespace: 'bun-compat' }, () => ({
      contents: `
        export function feature(name) {
          const features = globalThis.__FEATURES__ || {};
          return features[name] ?? false;
        }
      `,
      loader: 'js',
    }));
  },
};

// Plugin to handle .md text imports (Bun's text loader, not built-in to esbuild)
const mdTextPlugin: esbuild.Plugin = {
  name: 'md-text',
  setup(build) {
    build.onResolve({ filter: /\.md$/ }, (args) => {
      return {
        path: args.path,
        namespace: 'md-text',
      };
    });

    build.onLoad({ filter: /.*/, namespace: 'md-text' }, (args) => ({
      contents: readFileSync(args.path, 'utf-8'),
      loader: 'text',
    }));
  },
};

// Plugin to stub only @ant/* modules; all other modules use esbuild's native resolver
const stubAntOnlyPlugin: esbuild.Plugin = {
  name: 'stub-ant-only',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      // Skip node_modules, absolute paths, and bun: imports
      if (
        (args.path.startsWith('node_modules') || isAbsolute(args.path) || args.path.startsWith('bun:')) ||
        (!args.path.startsWith('./') && !args.path.startsWith('../') && !args.path.startsWith('src/') && !args.path.startsWith('@ant/'))
      ) {
        return null;
      }

      // Stub @ant/* packages (removed in MiniClaude) — allowlisted only
      if (args.path.startsWith('@ant/')) {
        return {
          path: args.path,
          namespace: 'stub',
        };
      }

      // Non-@ant/* modules: let esbuild's native resolver handle them.
      // If the module doesn't exist, esbuild will emit a proper build error.
      return null;
    });

    build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
      contents: `
        // Stub: ${args.path} (removed in MiniClaude)
        // Proxy returns undefined for any property access, preventing
        // "No matching export" errors during bundling and "undefined is not
        // a function" errors at runtime for code paths behind feature flags.
        module.exports = new Proxy({}, { get: (t, p) => p === '__esModule' ? true : undefined });
      `,
      loader: 'js',
    }));
  },
};

const result = await esbuild.build({
  entryPoints: [join(import.meta.dirname, '..', 'src/entrypoints/cli.tsx')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: join(distDir, 'miniclaude-node.js'),
  format: 'esm',
  minify: !dev,
  sourcemap: dev,
  metafile: enableMetafile,
  plugins: [bunBundlePlugin, mdTextPlugin, stubAntOnlyPlugin],
  banner: {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
  },
  external: [
    'crypto',
    'node:events',
    'node:fs',
    'node:path',
    'node:crypto',
    'node:http',
    'node:net',
    'node:child_process',
    'node:os',
    'node:stream',
    'node:util',
    'node:url',
    'node:buffer',
    'node:process',
    'node:timers',
    'node:querystring',
    'node:assert',
    'node:tty',
    'node:readline',
    'node:zlib',
    'node:string_decoder',
    'node:dns',
    'node:http2',
    'node:https',
    'node:perf_hooks',
    'node:v8',
    'node:worker_threads',
    'audio-capture-napi',
    'image-processor-napi',
    'modifiers-napi',
    'url-handler-napi',
  ],
  define: {
    'globalThis.__FEATURES__': JSON.stringify({
      BUN_BYTECODE: false,
      BUN_BUNDLE: false,
      NODE_COMPAT: true,
    }),
    'process.env.USER_TYPE': JSON.stringify('external'),
    'process.env.CLAUDE_CODE_FORCE_FULL_LOGO': JSON.stringify('true'),
    'process.env.CLAUDE_CODE_VERIFY_PLAN': JSON.stringify('false'),
    'process.env.CCR_FORCE_BUNDLE': JSON.stringify('true'),
    ...(dev ? { 'process.env.NODE_ENV': JSON.stringify('development') } : {}),
    'MACRO.VERSION': JSON.stringify(version),
    'MACRO.BUILD_TIME': JSON.stringify(buildTime),
    'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
    'MACRO.NATIVE_PACKAGE_URL': 'undefined',
    'MACRO.FEEDBACK_CHANNEL': JSON.stringify('github'),
    'MACRO.ISSUES_EXPLAINER': JSON.stringify(
      'This reconstructed source snapshot does not include Anthropic internal issue routing.',
    ),
    'MACRO.VERSION_CHANGELOG': JSON.stringify('https://github.com/paoloanzn/claude-code'),
  },
  logLevel: 'info',
});

if (result.errors.length > 0) {
  console.error('Build failed with errors:');
  for (const err of result.errors) {
    console.error(err);
  }
  process.exit(1);
}

console.log(`\n✅ Built dist/miniclaude-node.js (${dev ? 'dev' : 'production'})`);

if (enableMetafile && result.metafile) {
  try {
    const metafilePath = join(distDir, 'metafile.json');
    writeFileSync(metafilePath, JSON.stringify(result.metafile, null, 2));
    console.log(`✅ Metafile written to dist/metafile.json`);
  } catch (err) {
    console.warn(`⚠️ Could not write metafile: ${(err as Error).message}`);
  }
}
