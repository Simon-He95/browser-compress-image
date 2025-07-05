import Compressor from 'compressorjs'
// compressorjs 工具
export default async function compressWithCompressorJS(
  file: File,
  options: {
    quality: number
    mode: string
    targetWidth?: number
    targetHeight?: number
    maxWidth?: number
    maxHeight?: number
    preserveExif?: boolean
  },
): Promise<Blob> {
  const { quality, mode, targetWidth, targetHeight, maxWidth, maxHeight, preserveExif = false } =
    options

  // CompressorJS 主要适用于 JPEG，对于其他格式效果有限
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
    throw new Error('CompressorJS is optimized for JPEG files')
  }

  return new Promise((resolve, reject) => {
    const compressorOptions: Compressor.Options = {
      quality,
      retainExif: preserveExif, // 如果保留EXIF，则不检查方向
      mimeType: file.type,
      success: (compressedBlob: Blob | File) => resolve(compressedBlob as Blob),
      error: reject,
    }

    if (mode === 'keepQuality') {
      if (targetWidth) compressorOptions.width = targetWidth
      if (targetHeight) compressorOptions.height = targetHeight
      if (maxWidth) compressorOptions.maxWidth = maxWidth
      if (maxHeight) compressorOptions.maxHeight = maxHeight
    }

    // eslint-disable-next-line no-new
    new Compressor(file, compressorOptions)
  })
}
