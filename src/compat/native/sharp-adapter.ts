type SharpConstructor = typeof import('sharp')['default']
let sharpModule: SharpConstructor | null | undefined = undefined

async function getSharp(): Promise<SharpConstructor | null> {
  if (sharpModule === undefined) {
    try {
      sharpModule = (await import('sharp')).default as SharpConstructor
    } catch {
      sharpModule = null
      console.warn('[miniclaude] sharp not available — QR code features disabled.')
      console.warn('  Install: npm install sharp')
    }
  }
  return sharpModule
}

export const loadSharp = getSharp

export async function createSharpAdapter(buffer: Buffer) {
  const sharp = await getSharp()
  if (!sharp) return null

  const instance = sharp(buffer)

  const adapter = {
    resize: (width: number, height: number) => {
      instance.resize(width, height)
      return adapter
    },
    toBuffer: () => instance.toBuffer(),
  }

  return adapter
}
