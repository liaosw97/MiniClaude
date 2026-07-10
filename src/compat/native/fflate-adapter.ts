let fflateModule: typeof import('fflate') | null | undefined = undefined

async function getFflate(): Promise<typeof import('fflate') | null> {
  if (fflateModule === undefined) {
    try {
      fflateModule = await import('fflate')
    } catch {
      fflateModule = null
      console.warn('[miniclaude] fflate not available — compression features disabled.')
      console.warn('  Install: npm install fflate')
    }
  }
  return fflateModule
}

export async function loadFflate() {
  const mod = await getFflate()
  if (!mod) return null
  return { zipSync: mod.zipSync, unzipSync: mod.unzipSync }
}

export async function createFflateAdapter() {
  const fflate = await getFflate()
  if (!fflate) return null

  return {
    zip: (files: Record<string, Uint8Array>) => {
      return fflate.zipSync(files)
    },
    unzip: (data: Uint8Array) => {
      return fflate.unzipSync(data)
    },
  }
}
