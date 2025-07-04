import imageCompression, { Options } from 'browser-image-compression'

// browser-image-compression 工具
export default async function compressWithBrowserImageCompression(
  file: File,
  options: {
    quality: number
    mode: string
    targetWidth?: number
    targetHeight?: number
    maxWidth?: number
    maxHeight?: number
  },
): Promise<Blob> {
  const { quality, mode, targetWidth, targetHeight, maxWidth, maxHeight } =
    options

  const compressionOptions: Options = {
    useWebWorker: true,
    initialQuality: quality,
    alwaysKeepResolution: mode === 'keepSize',
    exifOrientation: 1,
    fileType: file.type,
    preserveExif: true,
    maxSizeMB: (file.size * 0.8) / (1024 * 1024), // 设置为原始文件大小的 MB
    maxWidthOrHeight:
      Math.min(maxWidth || targetWidth!, maxHeight || targetHeight!) ||
      undefined,
  }

  return await imageCompression(file, compressionOptions)
}
