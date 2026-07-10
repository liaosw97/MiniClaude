import { mkdirSync, writeFileSync, readFileSync, rmSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const RG_VERSION = '14.1.0';
const VENDOR_DIR = join(import.meta.dirname, '..', 'src', 'vendor', 'ripgrep');

// Platform mapping: Node.js process.platform → ripgrep release platform name
const PLATFORM_MAP: Record<string, Record<string, { triple: string; ext: string }>> = {
  win32: { x64: { triple: 'x86_64-pc-windows-msvc', ext: '.zip' } },
  darwin: {
    x64: { triple: 'x86_64-apple-darwin', ext: '.tar.gz' },
    arm64: { triple: 'aarch64-apple-darwin', ext: '.tar.gz' },
  },
  linux: { x64: { triple: 'x86_64-unknown-linux-musl', ext: '.tar.gz' } },
};

function getTargetTriple(platform: string, arch: string): string | null {
  return PLATFORM_MAP[platform]?.[arch]?.triple ?? null;
}

function getArchiveExt(platform: string, arch: string): string {
  return PLATFORM_MAP[platform]?.[arch]?.ext ?? '.tar.gz';
}

function getDestDir(platform: string, arch: string): string {
  const archMap: Record<string, string> = { x64: 'x64', arm64: 'arm64' };
  const platMap: Record<string, string> = {
    win32: 'win32',
    darwin: 'darwin',
    linux: 'linux',
  };
  return join(VENDOR_DIR, `${archMap[arch] || arch}-${platMap[platform] || platform}`);
}

function getBinaryName(platform: string): string {
  return platform === 'win32' ? 'rg.exe' : 'rg';
}

export async function fetchRipgrep(
  platform: string = process.platform,
  arch: string = process.arch,
): Promise<void> {
  const triple = getTargetTriple(platform, arch);
  if (!triple) {
    throw new Error(
      `Unsupported platform: ${platform}-${arch}. Supported: linux-x64, darwin-x64, darwin-arm64, win32-x64`,
    );
  }

  const ext = getArchiveExt(platform, arch);
  const url = `https://github.com/BurntSushi/ripgrep/releases/download/${RG_VERSION}/ripgrep-${RG_VERSION}-${triple}${ext}`;
  const destDir = getDestDir(platform, arch);
  const binaryName = getBinaryName(platform);
  const binaryPath = join(destDir, binaryName);
  const tmpDir = join(VENDOR_DIR, `.tmp-${platform}-${arch}`);

  console.log(`\n📥 Downloading ripgrep ${RG_VERSION} for ${platform}-${arch}...`);
  console.log(`  URL: ${url}`);

  try {
    mkdirSync(tmpDir, { recursive: true });
    const archivePath = join(tmpDir, `ripgrep${ext}`);

    // Download
    execSync(`curl -sL "${url}" -o "${archivePath}"`, { stdio: 'inherit' });

    // Extract
    if (ext === '.zip') {
      execSync(`unzip -o "${archivePath}" -d "${tmpDir}"`, { stdio: 'inherit' });
    } else {
      execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { stdio: 'inherit' });
    }

    // The extracted folder is ripgrep-{version}-{triple}/
    const extractedDir = join(tmpDir, `ripgrep-${RG_VERSION}-${triple}`);
    mkdirSync(destDir, { recursive: true });
    const extractedBinary = join(extractedDir, binaryName);
    const binaryData = readFileSync(extractedBinary);
    writeFileSync(binaryPath, binaryData, { mode: 0o755 });

    // Cleanup
    rmSync(tmpDir, { recursive: true });

    const size = (statSync(binaryPath).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Downloaded ripgrep for ${platform}-${arch} (${size} MB)`);
  } catch (error) {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true });
    }
    const msg = `Failed to download ripgrep for ${platform}-${arch} (URL: ${url}): ${(error as Error).message}`;
    throw new Error(msg);
  }
}

export async function fetchAllRipgrep(): Promise<void> {
  const platforms = [
    { platform: 'linux', arch: 'x64' },
    { platform: 'darwin', arch: 'x64' },
    { platform: 'darwin', arch: 'arm64' },
    { platform: 'win32', arch: 'x64' },
  ];

  const results = await Promise.allSettled(
    platforms.map(p => fetchRipgrep(p.platform, p.arch)),
  );

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    for (const f of failed) {
      console.error(`  ✗ ${(f as PromiseRejectedResult).reason}`);
    }
    throw new Error(`❌ ${failed.length} platform(s) failed to download`);
  }
}

// Main (only runs when executed directly - guarded by import.meta.main)
// Bun supports import.meta.main; when imported as module, this block is skipped.
const args = process.argv.slice(2);
if (import.meta.main) {
  if (args.includes('--all')) {
    await fetchAllRipgrep().catch(error => {
      console.error(`❌ ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    });
  } else {
    await fetchRipgrep().catch(error => {
      console.error(`❌ ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    });
  }
}