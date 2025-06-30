import type {
  CompressOptions,
  CompressResult,
  CompressResultType,
} from './types'
import imageCompression from 'browser-image-compression'
import Compressor from 'compressorjs'
import gifsicle from 'gifsicle-wasm-browser'

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

  // 根据文件类型和模式进行压缩
  if (file.type.includes('png')) {
    return compressPNG(
      file,
      { quality, mode, targetWidth, targetHeight, maxWidth, maxHeight },
      resultType,
    )
  } else if (file.type.includes('gif')) {
    return compressGIF(
      file,
      { quality, mode, targetWidth, targetHeight, maxWidth, maxHeight },
      resultType,
    )
  } else {
    // JPEG 和其他格式
    return compressJPEG(
      file,
      { quality, mode, targetWidth, targetHeight, maxWidth, maxHeight },
      resultType,
    )
  }
}

// PNG 压缩函数
async function compressPNG<T extends CompressResultType>(
  file: File,
  options: {
    quality: number
    mode: string
    targetWidth?: number
    targetHeight?: number
    maxWidth?: number
    maxHeight?: number
  },
  resultType: T,
): Promise<CompressResult<T>> {
  const { quality, mode, targetWidth, targetHeight, maxWidth, maxHeight } =
    options

  if (mode === 'keepSize') {
    // 保持尺寸不变
    // 对于PNG，优先使用专门的压缩库，而不是Canvas重绘
    try {
      const compressionOptions: any = {
        useWebWorker: true,
        initialQuality: quality,
        alwaysKeepResolution: true, // PNG保持分辨率
        exifOrientation: 1,
        fileType: 'image/png',
        preserveExif: true,
        maxSizeMB: 50, // 设置较大的限制，主要依靠质量控制
      }

      const compressedFile = await imageCompression(file, compressionOptions)

      // 如果压缩效果不明显且质量要求高，考虑返回原文件
      if (compressedFile.size >= file.size * 0.95 && quality > 0.9) {
        return convertBlobToType(file, resultType, file.name)
      }

      return convertBlobToType(compressedFile, resultType, file.name)
    } catch (error) {
      // 如果专门的PNG压缩失败，回退到Canvas方法
      console.warn('PNG compression failed, falling back to Canvas:', error)
      const { width, height } = await getImageDimensions(file)
      const compressedBlob = await redrawImageWithExactSize(
        file,
        width,
        height,
        quality,
      )

      if (compressedBlob.size >= file.size && quality > 0.8) {
        return convertBlobToType(file, resultType, file.name)
      }

      return convertBlobToType(compressedBlob, resultType, file.name)
    }
  } else {
    // keepQuality 模式：保持质量，改变尺寸
    const compressionOptions: any = {
      useWebWorker: true,
      initialQuality: 1, // 保持高质量
      alwaysKeepResolution: false,
      exifOrientation: 1, // 保持原始方向
      fileType: file.type, // 保持原始文件类型
    }

    // 可选参数，避免在不支持的情况下出错
    try {
      compressionOptions.preserveExif = true // 保留EXIF数据
    } catch (e) {
      console.warn('preserveExif not supported:', e)
    }

    if (targetWidth) compressionOptions.maxWidthOrHeight = targetWidth
    if (targetHeight && !targetWidth)
      compressionOptions.maxWidthOrHeight = targetHeight
    if (maxWidth) compressionOptions.maxWidth = maxWidth
    if (maxHeight) compressionOptions.maxHeight = maxHeight

    const compressedFile = await imageCompression(file, compressionOptions)
    return convertBlobToType(compressedFile, resultType, file.name)
  }
}

// GIF 压缩函数
async function compressGIF<T extends CompressResultType>(
  file: File,
  options: {
    quality: number
    mode: string
    targetWidth?: number
    targetHeight?: number
    maxWidth?: number
    maxHeight?: number
  },
  resultType: T,
): Promise<CompressResult<T>> {
  const { quality, mode } = options

  let command: string
  if (mode === 'keepSize') {
    // 保持尺寸，只改变质量
    command = `
      -O1 
      --lossy=${(1 - quality) * 100} 
      ${file.name} 
      -o /out/${file.name}
    `
  } else {
    // keepQuality 模式，可以添加resize命令
    const { targetWidth, targetHeight, maxWidth, maxHeight } = options
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

  const compressedBlob = (
    await gifsicle.run({
      input: [
        {
          file,
          name: file.name,
        },
      ],
      command: [command],
    })
  )[0]

  return convertBlobToType(compressedBlob, resultType, file.name)
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

// Canvas 重绘函数，确保精确尺寸控制并保持色彩质量
function redrawImageWithExactSize(
  file: File,
  targetWidth: number,
  targetHeight: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // 创建 Canvas
      const canvas = document.createElement('canvas')

      // 安全的Canvas上下文创建，带有兼容性检查
      const contextOptions: any = {
        alpha: file.type.includes('png'), // PNG保持透明度，JPEG不需要
        willReadFrequently: false,
      }

      // 尝试使用display-p3，如果不支持则回退到srgb
      let ctx: CanvasRenderingContext2D | null = null
      try {
        contextOptions.colorSpace = 'display-p3'
        ctx = canvas.getContext(
          '2d',
          contextOptions,
        ) as CanvasRenderingContext2D | null
        if (!ctx) {
          contextOptions.colorSpace = 'srgb'
          ctx = canvas.getContext(
            '2d',
            contextOptions,
          ) as CanvasRenderingContext2D | null
        }
      } catch (e) {
        // 如果display-p3不支持，使用默认设置
        ctx = canvas.getContext('2d', {
          alpha: contextOptions.alpha,
        }) as CanvasRenderingContext2D | null
      }

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // 设置精确的尺寸
      canvas.width = targetWidth
      canvas.height = targetHeight

      // 优化Canvas渲染质量
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 直接绘制图片，不进行额外的颜色处理
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      // 转换为 Blob，保持原始格式和用户指定的质量
      const outputType = file.type
      const outputQuality = file.type.includes('png') ? undefined : quality // 使用用户指定的质量

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob from canvas'))
          }
        },
        outputType,
        outputQuality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    // 设置图片的颜色空间和解码设置
    img.decoding = 'sync'
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

// JPEG 压缩函数
async function compressJPEG<T extends CompressResultType>(
  file: File,
  options: {
    quality: number
    mode: string
    targetWidth?: number
    targetHeight?: number
    maxWidth?: number
    maxHeight?: number
  },
  resultType: T,
): Promise<CompressResult<T>> {
  const { quality, mode, targetWidth, targetHeight, maxWidth, maxHeight } =
    options

  if (mode === 'keepSize') {
    // 保持尺寸不变，使用 Canvas 精确控制
    const { width, height } = await getImageDimensions(file)

    const compressedBlob = await redrawImageWithExactSize(
      file,
      width,
      height,
      quality,
    )

    // 检查压缩后的文件是否比原文件更大，如果是则返回原文件
    if (compressedBlob.size >= file.size && quality > 0.8) {
      return convertBlobToType(file, resultType, file.name)
    }

    return convertBlobToType(compressedBlob, resultType, file.name)
  } else {
    // keepQuality 模式：改变尺寸，保持质量
    return new Promise((resolve, reject) => {
      const compressorOptions: any = {
        quality, // 使用传入的质量参数
        checkOrientation: false, // 不自动旋转，保持原始状态
        mimeType: file.type, // 保持原始MIME类型
        success: (compressedBlob: Blob | File) =>
          convertBlobToType(compressedBlob as Blob, resultType, file.name)
            .then(resolve)
            .catch(reject),
        error: reject,
      }

      if (targetWidth) compressorOptions.width = targetWidth
      if (targetHeight) compressorOptions.height = targetHeight
      if (maxWidth) compressorOptions.maxWidth = maxWidth
      if (maxHeight) compressorOptions.maxHeight = maxHeight

      // eslint-disable-next-line no-new
      new Compressor(file, compressorOptions)
    })
  }
}

export default compress
