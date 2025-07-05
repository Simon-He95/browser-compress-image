// Canvas 工具
export default async function compressWithCanvas(
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
  const { quality, targetWidth, targetHeight, maxWidth, maxHeight, preserveExif = false } = options

  // 注意：Canvas API 本身不支持 EXIF 保留，preserveExif 参数在此处被忽略
  // 如果需要保留 EXIF，建议使用其他压缩工具如 browser-image-compression

  let finalWidth = targetWidth || maxWidth,
    finalHeight = targetHeight || maxHeight

  if (!finalWidth && !finalHeight) {
    const { width, height } = await getImageDimensions(file)
    finalWidth = width
    finalHeight = height
  }

  // 智能压缩策略
  return await smartCanvasCompress(file, finalWidth!, finalHeight!, quality)
}

// 智能 Canvas 压缩函数
async function smartCanvasCompress(
  file: File,
  targetWidth: number,
  targetHeight: number,
  quality: number,
): Promise<Blob> {
  const originalSize = file.size
  const { width: originalWidth, height: originalHeight } =
    await getImageDimensions(file)

  // 如果尺寸没有变化且是高度优化的小文件，直接返回原文件
  if (
    targetWidth === originalWidth &&
    targetHeight === originalHeight &&
    originalSize < 100 * 1024
  ) {
    // 小于100KB的文件
    return file
  }

  // 对于PNG文件，尝试多种策略
  if (file.type.includes('png')) {
    // 策略1: 保持PNG格式，使用较高质量
    const pngResult = await canvasCompressWithFormat(
      file,
      targetWidth,
      targetHeight,
      'image/png',
      undefined,
    )

    // 如果PNG结果比原文件小很多，使用PNG
    if (pngResult.size < originalSize * 0.8) {
      return pngResult
    }

    // 策略2: 转换为JPEG（如果质量较低）
    if (quality < 0.8) {
      const jpegResult = await canvasCompressWithFormat(
        file,
        targetWidth,
        targetHeight,
        'image/jpeg',
        Math.max(0.7, quality),
      )

      // 选择更小的结果
      if (jpegResult.size < Math.min(pngResult.size, originalSize * 0.9)) {
        return jpegResult
      }
    }

    // 如果压缩结果都不理想，返回原文件
    if (pngResult.size >= originalSize * 0.95) {
      return file
    }

    return pngResult
  }

  // 对于JPEG文件，使用渐进式质量压缩
  if (file.type.includes('jpeg') || file.type.includes('jpg')) {
    const qualities = [
      quality,
      Math.max(0.5, quality - 0.2),
      Math.max(0.3, quality - 0.4),
    ]

    for (const q of qualities) {
      const result = await canvasCompressWithFormat(
        file,
        targetWidth,
        targetHeight,
        file.type,
        q,
      )

      // 如果找到合适的压缩结果，返回
      if (result.size < originalSize * 0.8) {
        return result
      }
    }

    // 如果所有质量都不理想，返回原文件
    return file
  }

  // 其他格式，使用标准压缩
  const result = await canvasCompressWithFormat(
    file,
    targetWidth,
    targetHeight,
    file.type,
    quality,
  )

  // 如果压缩后更大，返回原文件
  if (result.size >= originalSize * 0.95) {
    return file
  }

  return result
}

// Canvas 压缩指定格式
async function canvasCompressWithFormat(
  file: File,
  targetWidth: number,
  targetHeight: number,
  outputType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', {
        alpha: outputType.includes('png'),
        willReadFrequently: false,
        // 不使用 colorSpace 以提高兼容性
      })

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      canvas.width = targetWidth
      canvas.height = targetHeight

      // 根据输出类型优化渲染
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 如果转换为JPEG，添加白色背景
      if (outputType.includes('jpeg') && !file.type.includes('jpeg')) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, targetWidth, targetHeight)
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        },
        outputType,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

// 获取图片原始尺寸的辅助函数
function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url) // 清理 URL
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url) // 清理 URL
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
