import type {
  CompressOptions,
  CompressResult,
  CompressResultType,
  MultipleCompressResults,
  CompressResultItem,
} from './types'
import compressWithBrowserImageCompression from './compressWithBrowserImageCompression'
import compressWithCompressorJS from './compressWithCompressorJS'
import compressWithCanvas from './compressWithCanvas'
import compressWithGifsicle from './compressWithGifsicle'
import convertBlobToType from './convertBlobToType'

// 开发环境日志工具
const devLog = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args)
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args)
    }
  },
  table: (data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.table(data)
    }
  },
}

// 压缩工具类型定义
type CompressorTool =
  | 'browser-image-compression'
  | 'compressorjs'
  | 'gifsicle'
  | 'canvas'
  | 'original' // 添加原文件选项

// 支持 EXIF 保留的工具
const EXIF_SUPPORTED_TOOLS: CompressorTool[] = [
  'browser-image-compression',
  'compressorjs',
]

// 压缩结果接口
interface CompressionAttempt {
  tool: CompressorTool
  blob: Blob
  size: number
  success: boolean
  error?: string
  duration: number // 压缩耗时（毫秒）
}

const toolsCollections: Record<string, CompressorTool[]> = {
  png: ['browser-image-compression', 'canvas'],
  gif: ['gifsicle'],
  webp: ['canvas', 'browser-image-compression'],
  others: ['browser-image-compression', 'compressorjs', 'canvas'],
}

// 重载：支持新的选项对象参数 - 返回多结果
export async function compress<T extends CompressResultType = 'blob'>(
  file: File,
  options: CompressOptions & { type?: T; returnAllResults: true },
): Promise<MultipleCompressResults<T>>

// 重载：支持新的选项对象参数 - 返回单结果
export async function compress<T extends CompressResultType = 'blob'>(
  file: File,
  options: CompressOptions & { type?: T; returnAllResults?: false },
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
): Promise<CompressResult<T> | MultipleCompressResults<T>> {
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
    preserveExif = false,
    returnAllResults = false,
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
    preserveExif,
  }

  // 根据文件类型选择合适的压缩工具组合
  const tools = file.type.includes('png')
    ? toolsCollections['png']
    : file.type.includes('gif')
      ? toolsCollections['gif']
      : file.type.includes('webp')
        ? toolsCollections['webp']
        : toolsCollections['others']

  // 如果需要返回所有结果
  if (returnAllResults) {
    return await compressWithMultipleToolsAndReturnAll(
      file,
      compressionOptions,
      tools,
      resultType,
    )
  }

  // 否则返回最佳结果
  const bestResult: Blob = await compressWithMultipleTools(
    file,
    compressionOptions,
    tools,
  )

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
    preserveExif?: boolean
  },
  tools: CompressorTool[],
): Promise<Blob> {
  const totalStartTime = performance.now()

  // 当需要保留 EXIF 时，过滤掉不支持的工具
  if (options.preserveExif) {
    tools = tools.filter((tool) => EXIF_SUPPORTED_TOOLS.includes(tool))
    if (tools.length === 0) {
      throw new Error(
        'No EXIF-supporting tools available for this file type. Please disable preserveExif or use a different file format.',
      )
    }
    devLog.log('preserveExif=true, filtered tools:', tools)
  }

  const attempts: CompressionAttempt[] = []
  // 并行运行所有压缩工具
  const promises = tools.map(async (tool) => {
    const startTime = performance.now()

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

      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      return {
        tool,
        blob: compressedBlob,
        size: compressedBlob.size,
        success: true,
        duration,
      } as CompressionAttempt
    } catch (error) {
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      return {
        tool,
        blob: file, // 失败时使用原文件
        size: file.size,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
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
      devLog.warn('Compression tool failed:', result.reason)
    }
  })

  // 过滤成功的结果
  const successfulAttempts = attempts.filter((attempt) => attempt.success)

  if (successfulAttempts.length === 0) {
    devLog.warn('All compression attempts failed, returning original file')
    return file
  }

  // 选择文件大小最小的结果
  const bestAttempt = successfulAttempts.reduce((best, current) =>
    current.size < best.size ? current : best,
  )

  // 如果最佳压缩结果仍然比原文件大，且质量设置较高，返回原文件
  if (bestAttempt.size >= file.size * 0.98 && options.quality > 0.85) {
    const totalEndTime = performance.now()
    const totalDuration = Math.round(totalEndTime - totalStartTime)

    devLog.log(
      `Best compression (${bestAttempt.tool}) size: ${bestAttempt.size}, original: ${file.size}, using original (total: ${totalDuration}ms)`,
    )
    return file
  }

  const totalEndTime = performance.now()
  const totalDuration = Math.round(totalEndTime - totalStartTime)

  devLog.log(
    `Best compression result: ${bestAttempt.tool} (${bestAttempt.size} bytes, ${(((file.size - bestAttempt.size) / file.size) * 100).toFixed(1)}% reduction, ${bestAttempt.duration}ms) - Total time: ${totalDuration}ms`,
  )

  // 输出所有工具的性能比较
  if (successfulAttempts.length > 1) {
    devLog.table(
      successfulAttempts.map((attempt) => ({
        Tool: attempt.tool,
        'Size (bytes)': attempt.size,
        'Reduction (%)': `${(((file.size - attempt.size) / file.size) * 100).toFixed(1)}%`,
        'Duration (ms)': attempt.duration,
        'Speed (MB/s)': `${(file.size / 1024 / 1024 / (attempt.duration / 1000)).toFixed(2)}`,
      })),
    )
  }

  return bestAttempt.blob
}

// 多工具压缩并返回所有结果的函数
async function compressWithMultipleToolsAndReturnAll<
  T extends CompressResultType,
>(
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
  tools: CompressorTool[],
  resultType: T,
): Promise<MultipleCompressResults<T>> {
  const totalStartTime = performance.now()

  // 当需要保留 EXIF 时，过滤掉不支持的工具
  if (options.preserveExif) {
    tools = tools.filter((tool) => EXIF_SUPPORTED_TOOLS.includes(tool))
    if (tools.length === 0) {
      throw new Error(
        'No EXIF-supporting tools available for this file type. Please disable preserveExif or use a different file format.',
      )
    }
    devLog.log('preserveExif=true, filtered tools:', tools)
  }

  const attempts: CompressionAttempt[] = []

  // 并行运行所有压缩工具
  const promises = tools.map(async (tool) => {
    const startTime = performance.now()

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

      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      return {
        tool,
        blob: compressedBlob,
        size: compressedBlob.size,
        success: true,
        duration,
      } as CompressionAttempt
    } catch (error) {
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      return {
        tool,
        blob: file, // 失败时使用原文件
        size: file.size,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
      } as CompressionAttempt
    }
  })

  // 等待所有压缩尝试完成
  const results = await Promise.allSettled(promises)

  // 处理结果
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      attempts.push(result.value)
    } else {
      devLog.warn('Compression tool failed:', result.reason)
    }
  })

  if (attempts.length === 0) {
    throw new Error('All compression attempts failed')
  }

  const totalEndTime = performance.now()
  const totalDuration = Math.round(totalEndTime - totalStartTime)

  // 转换所有结果为指定类型
  const allResults: CompressResultItem<T>[] = await Promise.all(
    attempts.map(async (attempt) => {
      const convertedResult = await convertBlobToType(
        attempt.blob,
        resultType,
        file.name,
      )
      return {
        tool: attempt.tool,
        result: convertedResult,
        originalSize: file.size,
        compressedSize: attempt.size,
        compressionRatio: ((file.size - attempt.size) / file.size) * 100,
        duration: attempt.duration,
        success: attempt.success,
        error: attempt.error,
      }
    }),
  )

  // 找到最佳结果（成功的结果中文件大小最小的）
  const successfulAttempts = attempts.filter((attempt) => attempt.success)
  let bestAttempt: CompressionAttempt

  if (successfulAttempts.length > 0) {
    bestAttempt = successfulAttempts.reduce((best, current) =>
      current.size < best.size ? current : best,
    )

    // 如果最佳压缩结果仍然比原文件大，且质量设置较高，使用原文件
    if (bestAttempt.size >= file.size * 0.98 && options.quality > 0.85) {
      bestAttempt = {
        tool: 'original',
        blob: file,
        size: file.size,
        success: true,
        duration: 0,
      }
    }
  } else {
    // 如果所有工具都失败，使用原文件
    bestAttempt = {
      tool: 'original',
      blob: file,
      size: file.size,
      success: true,
      duration: 0,
    }
  }

  const bestResult = await convertBlobToType(
    bestAttempt.blob,
    resultType,
    file.name,
  )

  devLog.log(
    `Best compression result: ${bestAttempt.tool} (${bestAttempt.size} bytes, ${(((file.size - bestAttempt.size) / file.size) * 100).toFixed(1)}% reduction) - Total time: ${totalDuration}ms`,
  )

  // 输出所有工具的性能比较
  if (successfulAttempts.length > 1) {
    devLog.table(
      successfulAttempts.map((attempt) => ({
        Tool: attempt.tool,
        'Size (bytes)': attempt.size,
        'Reduction (%)': `${(((file.size - attempt.size) / file.size) * 100).toFixed(1)}%`,
        'Duration (ms)': attempt.duration,
        'Speed (MB/s)': `${(file.size / 1024 / 1024 / (attempt.duration / 1000)).toFixed(2)}`,
      })),
    )
  }

  return {
    bestResult,
    bestTool: bestAttempt.tool,
    allResults,
    totalDuration,
  }
}

// 详细压缩统计信息接口
export interface CompressionStats {
  bestTool: string
  compressedFile: Blob
  originalSize: number
  compressedSize: number
  compressionRatio: number
  totalDuration: number
  toolsUsed: {
    tool: string
    size: number
    duration: number
    compressionRatio: number
    success: boolean
    error?: string
  }[]
}

// 带详细统计信息的压缩函数
export async function compressWithStats(
  file: File,
  qualityOrOptions?: number | CompressOptions,
): Promise<CompressionStats> {
  // 使用多工具压缩并返回详细统计
  return await compressWithMultipleToolsWithStats(file, {
    quality:
      typeof qualityOrOptions === 'object'
        ? qualityOrOptions.quality || 0.6
        : qualityOrOptions || 0.6,
    mode:
      typeof qualityOrOptions === 'object'
        ? qualityOrOptions.mode || 'keepSize'
        : 'keepSize',
    targetWidth:
      typeof qualityOrOptions === 'object'
        ? qualityOrOptions.targetWidth
        : undefined,
    targetHeight:
      typeof qualityOrOptions === 'object'
        ? qualityOrOptions.targetHeight
        : undefined,
    maxWidth:
      typeof qualityOrOptions === 'object'
        ? qualityOrOptions.maxWidth
        : undefined,
    maxHeight:
      typeof qualityOrOptions === 'object'
        ? qualityOrOptions.maxHeight
        : undefined,
    preserveExif:
      typeof qualityOrOptions === 'object'
        ? qualityOrOptions.preserveExif || false
        : false,
  })
}

// 带统计信息的多工具压缩函数
async function compressWithMultipleToolsWithStats(
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
): Promise<CompressionStats> {
  const totalStartTime = performance.now()

  // 根据文件类型选择工具
  let tools = file.type.includes('png')
    ? toolsCollections['png']
    : file.type.includes('gif')
      ? toolsCollections['gif']
      : file.type.includes('webp')
        ? toolsCollections['webp']
        : toolsCollections['others']

  // 当需要保留 EXIF 时，过滤掉不支持的工具
  if (options.preserveExif) {
    tools = tools.filter((tool) => EXIF_SUPPORTED_TOOLS.includes(tool))
    if (tools.length === 0) {
      throw new Error(
        'No EXIF-supporting tools available for this file type. Please disable preserveExif or use a different file format.',
      )
    }
    devLog.log('preserveExif=true, filtered tools:', tools)
  }

  const attempts: CompressionAttempt[] = []

  // 并行运行所有压缩工具（复用现有逻辑）
  const promises = tools.map(async (tool) => {
    const startTime = performance.now()

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

      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      return {
        tool,
        blob: compressedBlob,
        size: compressedBlob.size,
        success: true,
        duration,
      } as CompressionAttempt
    } catch (error) {
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      return {
        tool,
        blob: file,
        size: file.size,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
      } as CompressionAttempt
    }
  })

  const results = await Promise.allSettled(promises)

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      attempts.push(result.value)
    }
  })

  const successfulAttempts = attempts.filter((attempt) => attempt.success)
  const bestAttempt =
    successfulAttempts.length > 0
      ? successfulAttempts.reduce((best, current) =>
          current.size < best.size ? current : best,
        )
      : {
          tool: 'none',
          blob: file,
          size: file.size,
          success: false,
          duration: 0,
        }

  const totalEndTime = performance.now()
  const totalDuration = Math.round(totalEndTime - totalStartTime)

  return {
    bestTool: bestAttempt.tool,
    compressedFile: bestAttempt.blob,
    originalSize: file.size,
    compressedSize: bestAttempt.size,
    compressionRatio: ((file.size - bestAttempt.size) / file.size) * 100,
    totalDuration,
    toolsUsed: attempts.map((attempt) => ({
      tool: attempt.tool,
      size: attempt.size,
      duration: attempt.duration,
      compressionRatio: ((file.size - attempt.size) / file.size) * 100,
      success: attempt.success,
      error: attempt.error,
    })),
  }
}

export default compress
