import type {
  CompressOptions,
  CompressResult,
  CompressResultType,
} from './types'
import imageCompression, { Options } from 'browser-image-compression'
import Compressor from 'compressorjs'
import gifsicle from 'gifsicle-wasm-browser'

// 压缩工具类型定义
type CompressorTool =
  | 'browser-image-compression'
  | 'compressorjs'
  | 'gifsicle'
  | 'canvas'

// 压缩结果接口
interface CompressionAttempt {
  tool: CompressorTool
  blob: Blob
  size: number
  success: boolean
  error?: string
}

// 辅助函数：将 Blob 转换为不同格式
async function convertBlobToType<T extends CompressResultType>(
  blob: Blob,
  type: T,
  originalFileName?: string,
): Promise<CompressResult<T>> {
  switch (type) {
    case 'blob':
      return blob as CompressResult<T>
    case 'file':
      return new File([blob], originalFileName || 'compressed', {
        type: blob.type,
      }) as CompressResult<T>
    case 'base64':
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as CompressResult<T>)
        reader.readAsDataURL(blob)
      })
    case 'arrayBuffer':
      return blob.arrayBuffer() as Promise<CompressResult<T>>
    default:
      throw new Error(`Unsupported type: ${type}`)
  }
}

// 重载：支持新的选项对象参数
export async function compress<T extends CompressResultType = 'blob'>(
  file: File,
  options: CompressOptions & { type: T },
): Promise<CompressResult<T>>

// 重载：支持旧的参数格式(向后兼容)
export async function compress<T extends CompressResultType = 'blob'>(
  file: File,
  quality?: number,
  type?: T,
): Promise<CompressResult<T>>

// 实现
export async function compress<T extends CompressResultType = 'blob'>(
  file: File,
  qualityOrOptions?: number | (CompressOptions & { type?: T }),
  type?: T,
): Promise<CompressResult<T>> {
  // 解析参数
  let options: CompressOptions & { type?: T }

  if (typeof qualityOrOptions === 'object') {
    // 新的选项对象格式
    options = qualityOrOptions
  } else {
    // 旧的参数格式(向后兼容)
    options = {
      quality: qualityOrOptions || 0.6,
      mode: 'keepSize',
      type: type || ('blob' as T),
    }
  }

  // 设置默认值
  const {
    quality = 0.6,
    mode = 'keepSize',
    targetWidth,
    targetHeight,
    maxWidth,
    maxHeight,
    type: resultType = 'blob' as T,
  } = options

  // 使用多工具压缩比对策略
  const compressionOptions = {
    quality,
    mode,
    targetWidth,
    targetHeight,
    maxWidth,
    maxHeight,
  }

  let bestResult: Blob

  // 根据文件类型选择合适的压缩工具组合
  if (file.type.includes('png')) {
    bestResult = await compressWithMultipleTools(file, compressionOptions, [
      'browser-image-compression',
      'canvas',
    ])
  } else if (file.type.includes('gif')) {
    bestResult = await compressWithMultipleTools(file, compressionOptions, [
      'gifsicle',
      'browser-image-compression',
    ])
  } else {
    // JPEG 和其他格式
    bestResult = await compressWithMultipleTools(file, compressionOptions, [
      'browser-image-compression',
      'compressorjs',
      'canvas',
    ])
  }

  return convertBlobToType(bestResult, resultType, file.name)
}

// 多工具压缩比对核心函数
async function compressWithMultipleTools(
  file: File,
  options: {
    quality: number
    mode: string
    targetWidth?: number
    targetHeight?: number
    maxWidth?: number
    maxHeight?: number
  },
  tools: CompressorTool[],
): Promise<Blob> {
  const attempts: CompressionAttempt[] = []
  // 并行运行所有压缩工具
  const promises = tools.map(async (tool) => {
    try {
      let compressedBlob: Blob

      switch (tool) {
        case 'browser-image-compression':
          compressedBlob = await compressWithBrowserImageCompression(
            file,
            options,
          )
          break
        case 'compressorjs':
          compressedBlob = await compressWithCompressorJS(file, options)
          break
        case 'gifsicle':
          compressedBlob = await compressWithGifsicle(file, options)
          break
        case 'canvas':
          compressedBlob = await compressWithCanvas(file, options)
          break
        default:
          throw new Error(`Unknown compression tool: ${tool}`)
      }

      return {
        tool,
        blob: compressedBlob,
        size: compressedBlob.size,
        success: true,
      } as CompressionAttempt
    } catch (error) {
      return {
        tool,
        blob: file, // 失败时使用原文件
        size: file.size,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      } as CompressionAttempt
    }
  })

  // 等待所有压缩尝试完成（使用 allSettled 确保即使某些工具失败也能获得其他结果）
  const results = await Promise.allSettled(promises)

  // 处理结果，包括成功和失败的情况
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      attempts.push(result.value)
    } else {
      console.warn('Compression tool failed:', result.reason)
    }
  })

  // 过滤成功的结果
  const successfulAttempts = attempts.filter((attempt) => attempt.success)

  if (successfulAttempts.length === 0) {
    console.warn('All compression attempts failed, returning original file')
    return file
  }

  // 选择文件大小最小的结果
  const bestAttempt = successfulAttempts.reduce((best, current) =>
    current.size < best.size ? current : best,
  )

  // 如果最佳压缩结果仍然比原文件大，且质量设置较高，返回原文件
  if (bestAttempt.size >= file.size * 0.98 && options.quality > 0.85) {
    console.log(
      `Best compression (${bestAttempt.tool}) size: ${bestAttempt.size}, original: ${file.size}, using original`,
    )
    return file
  }

  console.log(
    `Best compression result: ${bestAttempt.tool} (${bestAttempt.size} bytes, ${(((file.size - bestAttempt.size) / file.size) * 100).toFixed(1)}% reduction)`,
  )

  return bestAttempt.blob
}

// browser-image-compression 工具
async function compressWithBrowserImageCompression(
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

// compressorjs 工具
async function compressWithCompressorJS(
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

  // CompressorJS 主要适用于 JPEG，对于其他格式效果有限
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
    throw new Error('CompressorJS is optimized for JPEG files')
  }

  return new Promise((resolve, reject) => {
    const compressorOptions: any = {
      quality,
      checkOrientation: false,
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

// gifsicle 工具
async function compressWithGifsicle(
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

  // Gifsicle 仅适用于 GIF
  if (!file.type.includes('gif')) {
    throw new Error('Gifsicle is only for GIF files')
  }

  let command: string
  if (mode === 'keepSize') {
    command = `
      -O1 
      --lossy=${Math.round((1 - quality) * 100)} 
      ${file.name} 
      -o /out/${file.name}
    `
  } else {
    let resizeOption = ''
    if (targetWidth && targetHeight) {
      resizeOption = `--resize ${targetWidth}x${targetHeight}`
    } else if (maxWidth || maxHeight) {
      const maxSize = Math.min(maxWidth || 9999, maxHeight || 9999)
      resizeOption = `--resize-fit ${maxSize}x${maxSize}`
    }

    command = `
      -O1 
      ${resizeOption}
      ${file.name} 
      -o /out/${file.name}
    `
  }

  const result = await gifsicle.run({
    input: [{ file, name: file.name }],
    command: [command],
  })

  return result[0]
}

// Canvas 工具
async function compressWithCanvas(
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
  const { quality, targetWidth, targetHeight, maxWidth, maxHeight } = options

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

export default compress
