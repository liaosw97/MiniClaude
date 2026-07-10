import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, statSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8'));
const version = pkg.version;
const distDir = join(import.meta.dirname, '..', 'dist');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

function run(cmd: string, cwd: string) {
  console.log(`  Running: ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to run: ${cmd}`);
    throw error;
  }
}

async function copyRipgrepForPlatform(
  vendorSrc: string,
  pkgDir: string,
  platform: string,
  arch: string,
): Promise<void> {
  const archLabel = arch === 'arm64' ? 'arm64' : 'x64';
  const platLabel = platform === 'win32' ? 'win32' : platform === 'darwin' ? 'darwin' : 'linux';
  const platformDir = `${archLabel}-${platLabel}`;
  const rgBinary = platform === 'win32' ? 'rg.exe' : 'rg';
  const rgSrc = join(vendorSrc, platformDir, rgBinary);

  if (existsSync(rgSrc)) {
    const vendorDest = join(pkgDir, 'vendor', 'ripgrep', platformDir);
    mkdirSync(vendorDest, { recursive: true });
    cpSync(rgSrc, join(vendorDest, rgBinary));
    console.log(`  ✅ Copied ripgrep (${platformDir})`);
    return;
  }

  // Binary not found — try to download it automatically
  console.warn(`⚠️  ripgrep binary not found for ${platformDir}, attempting download...`);
  try {
    const { fetchRipgrep } = await import('./fetch-ripgrep.js');
    await fetchRipgrep(platform, arch);
    // Retry copy after download
    if (existsSync(rgSrc)) {
      const vendorDest = join(pkgDir, 'vendor', 'ripgrep', platformDir);
      mkdirSync(vendorDest, { recursive: true });
      cpSync(rgSrc, join(vendorDest, rgBinary));
      console.log(`  ✅ Copied ripgrep after download (${platformDir})`);
    }
  } catch {
    console.warn(`⚠️  Could not download ripgrep for ${platformDir}`);
    console.warn('  Code search will be unavailable without system rg command');
  }
}

async function createOfflinePackage(platform?: string) {
  const suffix = platform ? `-${platform}` : '';
  const timestamp = Date.now();
  const stagingDir = join(distDir, `staging-${timestamp}${suffix}`);
  const pkgDir = join(stagingDir, 'package');

  // Create staging directory structure
  mkdirSync(join(pkgDir, 'dist'), { recursive: true });
  mkdirSync(join(pkgDir, 'bin'), { recursive: true });

  // Copy built Node.js bundle
  const nodeBundle = join(distDir, 'miniclaude-node.js');
  if (!existsSync(nodeBundle)) {
    console.error('❌ Node.js bundle not found. Run "bun run build:node" first.');
    process.exit(1);
  }
  cpSync(nodeBundle, join(pkgDir, 'dist', 'miniclaude-node.js'));

  // Create bin entry point
  const binContent = `#!/usr/bin/env node
import('../dist/miniclaude-node.js').catch(e => {
  console.error(e);
  process.exit(1);
});
`;
  writeFileSync(join(pkgDir, 'bin', 'miniclaude'), binContent, { mode: 0o755 });

  // Write package.json for offline package (no node_modules needed — bundle is self-contained)
  const offlinePkg = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: 'module',
    bin: {
      miniclaude: './bin/miniclaude',
      mclaude: './bin/miniclaude',
    },
    engines: {
      node: '>=20.0.0',
    },
    files: [
      'dist/',
      'bin/',
      'vendor/',
      'node_modules/',
    ],
    dependencies: {},  // Self-contained bundle — no runtime npm deps except xxhash-wasm (added by npm install below)
  };

  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify(offlinePkg, null, 2)
  );

  // No npm install — bundle is self-contained, all JS code is packed into miniclaude-node.js.
  // xxhash-wasm is installed individually below (WASM cannot be bundled by esbuild).
  // Sharp/fflate/claude-agent-sdk are optionalDependencies not included in offline package.
  // Users who need optional features install them separately:
  //   npm install sharp   (QR code rendering / image processing)
  //   npm install fflate  (compression)

  // Install xxhash-wasm (WASM cannot be bundled by esbuild, must be in node_modules)
  console.log('\n📦 Installing xxhash-wasm...');
  try {
    execSync('npm install xxhash-wasm', { cwd: pkgDir, stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to install xxhash-wasm');
    throw error;
  }

  // Verify node_modules exists after xxhash-wasm install
  if (!existsSync(join(pkgDir, 'node_modules'))) {
    console.error('❌ node_modules not created after npm install');
    process.exit(1);
  }

  // Copy vendor/ripgrep for code search functionality
  const vendorSrc = join(import.meta.dirname, '..', 'src', 'vendor', 'ripgrep');
  const archLabel = process.arch === 'arm64' ? 'arm64' : 'x64';
  const platLabel = process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const platformDir = `${archLabel}-${platLabel}`;

  await copyRipgrepForPlatform(vendorSrc, pkgDir, platLabel, archLabel);

  // In --all mode, copy ripgrep for all 4 supported platforms
  if (process.argv.includes('--all')) {
    const allPlatforms = [
      { platform: 'linux', arch: 'x64' },
      { platform: 'darwin', arch: 'x64' },
      { platform: 'darwin', arch: 'arm64' },
      { platform: 'win32', arch: 'x64' },
    ];
    for (const p of allPlatforms) {
      if (p.platform === platLabel && p.arch === archLabel) continue; // already copied
      await copyRipgrepForPlatform(vendorSrc, pkgDir, p.platform, p.arch);
    }
  }

  // Create .tgz package using tar directly
  const tgzName = `${pkg.name}-${version}${suffix}.tgz`;
  const tgzPath = join(distDir, tgzName);

  console.log(`\n📦 Creating ${tgzName}...`);

  // Use tar with relative paths to avoid Windows path issues
  const tarCmd = `tar -czf "${basename(tgzName)}" -C "${stagingDir}" package`;

  run(tarCmd, distDir);

  // Move the generated tgz to dist/
  const generatedTgz = join(distDir, `${pkg.name}-${version}.tgz`);
  if (existsSync(generatedTgz) && generatedTgz !== tgzPath) {
    cpSync(generatedTgz, tgzPath);
    rmSync(generatedTgz);
  }

  // Report size
  const stats = statSync(tgzPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Created ${tgzName} (${sizeMB} MB)`);

  if (stats.size > 100 * 1024 * 1024) {
    console.warn('⚠ Package size exceeds 100MB threshold. Consider optimizing.');
  }

  // Cleanup staging
  try {
    rmSync(stagingDir, { recursive: true });
  } catch (e) {
    console.warn(`⚠ Could not clean up staging directory: ${stagingDir}`);
  }

  return tgzPath;
}

// Main
createOfflinePackage().catch(error => {
  console.error(`❌ ${(error as Error).message}`);
  process.exit(1);
});
