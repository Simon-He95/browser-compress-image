import type {
  CompressOptions,
  CompressResult,
  CompressResultType,
} from './types'
import compressWithBrowserImageCompression from './compressWithBrowserImageCompression'
import compressWithCompressorJS from './compressWithCompressorJS'
import compressWithCanvas from './compressWithCanvas'
import compressWithGifsicle from './compressWithGifsicle'
import convertBlobToType from './convertBlobToType'

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

const toolsCollections: Record<string, CompressorTool[]> = {
  png: ['browser-image-compression', 'canvas'],
  gif: ['gifsicle'],
  webp: ['canvas', 'browser-image-compression'],
  others: ['browser-image-compression', 'compressorjs', 'canvas'],
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
    bestResult = await compressWithMultipleTools(
      file,
      compressionOptions,
      toolsCollections['png'],
    )
  } else if (file.type.includes('gif')) {
    bestResult = await compressWithMultipleTools(
      file,
      compressionOptions,
      toolsCollections['gif'],
    )
  } else if (file.type.includes('webp')) {
    bestResult = await compressWithMultipleTools(
      file,
      compressionOptions,
      toolsCollections['webp'],
    )
  } else {
    // JPEG 和其他格式
    bestResult = await compressWithMultipleTools(
      file,
      compressionOptions,
      toolsCollections['others'],
    )
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

export default compress
