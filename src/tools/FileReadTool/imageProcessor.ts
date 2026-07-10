import type { Buffer } from 'buffer'
import { isInBundledMode } from '../../utils/bundledMode.js'
import { loadSharp } from '../../compat/native/sharp-adapter.js'

export type SharpInstance = {
  metadata(): Promise<{ width: number; height: number; format: string }>
  resize(
    width: number,
    height: number,
    options?: { fit?: string; withoutEnlargement?: boolean },
  ): SharpInstance
  jpeg(options?: { quality?: number }): SharpInstance
  png(options?: {
    compressionLevel?: number
    palette?: boolean
    colors?: number
  }): SharpInstance
  webp(options?: { quality?: number }): SharpInstance
  toBuffer(): Promise<Buffer>
}

export type SharpFunction = (input: Buffer) => SharpInstance

type SharpCreatorOptions = {
  create: {
    width: number
    height: number
    channels: 3 | 4
    background: { r: number; g: number; b: number }
  }
}

type SharpCreator = (options: SharpCreatorOptions) => SharpInstance

let imageProcessorModule: { default: SharpFunction } | null = null
let imageCreatorModule: { default: SharpCreator } | null = null

export async function getImageProcessor(): Promise<SharpFunction> {
  if (imageProcessorModule) {
    return imageProcessorModule.default
  }

  if (isInBundledMode()) {
    // Try to load the native image processor first
    try {
      // Use the native image processor module
      const imageProcessor = await import('image-processor-napi')
      const sharp = imageProcessor.sharp || imageProcessor.default
      imageProcessorModule = { default: sharp }
      return sharp
    } catch {
      // Fall back to sharp if native module is not available
      // biome-ignore lint/suspicious/noConsole: intentional warning
      console.warn(
        'Native image processor not available, falling back to sharp',
      )
    }
  }

  // Use sharp for non-bundled builds or as fallback.
  // loadSharp() has built-in try-catch and returns null if sharp is not available.
  const sharpInstance = await loadSharp()
  if (!sharpInstance) {
    throw new Error('sharp is not available. Install: npm install sharp')
  }
  // Single structural cast: our SharpFunction is a subset of sharp's actual type surface.
  const sharp = sharpInstance as unknown as SharpFunction
  imageProcessorModule = { default: sharp }
  return sharp
}

/**
 * Get image creator for generating new images from scratch.
 * Note: image-processor-napi doesn't support image creation,
 * so this always uses sharp directly.
 */
export async function getImageCreator(): Promise<SharpCreator> {
  if (imageCreatorModule) {
    return imageCreatorModule.default
  }

  // loadSharp() has built-in try-catch and returns null if sharp is not available.
  const sharpInstance = await loadSharp()
  if (!sharpInstance) {
    throw new Error('sharp is not available. Install: npm install sharp')
  }
  // Single structural cast: our SharpCreator is a subset of sharp's actual type surface.
  const sharp = sharpInstance as unknown as SharpCreator
  imageCreatorModule = { default: sharp }
  return sharp
}

