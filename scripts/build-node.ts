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

// Plugin to stub missing modules dynamically
const stubMissingModulesPlugin: esbuild.Plugin = {
  name: 'stub-missing-modules',
  setup(build) {
    // Cache for missing modules (keyed by importer + path to avoid false hits)
    const missingCache = new Map<string, boolean>();

    build.onResolve({ filter: /.*/ }, (args) => {
      // Skip node_modules (except @ant/* which we stub), absolute paths, and bun: imports
      if (
        (args.path.startsWith('node_modules') || isAbsolute(args.path) || args.path.startsWith('bun:')) ||
        (!args.path.startsWith('./') && !args.path.startsWith('../') && !args.path.startsWith('src/') && !args.path.startsWith('@ant/'))
      ) {
        return null;
      }

      // Stub @ant/* packages (removed in MiniClaude)
      if (args.path.startsWith('@ant/')) {
        return {
          path: args.path,
          namespace: 'stub',
        };
      }

      // Skip if already known to be missing (use composite key importer + path)
      const cacheKey = `${args.importer || 'entry'}::${args.path}`;
      if (missingCache.has(cacheKey)) {
        return {
          path: args.path,
          namespace: 'stub',
        };
      }

      // Try to resolve the module
      let resolvedPath = args.path;
      const importerDir = args.importer ? dirname(args.importer) : srcDir;

      // Handle relative imports
      if (args.path.startsWith('./') || args.path.startsWith('../')) {
        resolvedPath = resolve(importerDir, args.path);
      } else {
        resolvedPath = resolve(srcDir, args.path);
      }

      // Check common extensions
      // Strip .js/.jsx to try .ts/.tsx (esbuild native behavior)
      const extStripped = resolvedPath.replace(/\.(js|jsx)$/i, '');
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx', ''];

      for (const ext of extensions) {
        const fullPath = extStripped + ext;
        if (existsSync(fullPath)) {
          return null; // Module exists, let esbuild handle it
        }
      }

      // Module doesn't exist, stub it
      missingCache.set(cacheKey, true);
      return {
        path: args.path,
        namespace: 'stub',
      };
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
  plugins: [bunBundlePlugin, stubMissingModulesPlugin],
  external: [
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
