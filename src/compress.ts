import type { CompressResult, CompressResultType } from './types'
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

export async function compress<T extends CompressResultType = 'blob'>(
  file: File,
  quality = 0.6,
  type: T = 'blob' as T,
): Promise<CompressResult<T>> {
  if (file.type.endsWith('png')) {
    const compressedFile = await imageCompression(file, {
      useWebWorker: true,
      initialQuality: quality,
    })
    return convertBlobToType(compressedFile, type, file.name)
  }
  else if (file.type.endsWith('gif')) {
    const compressedBlob = (await gifsicle.run({
      input: [{
        file,
        name: file.name,
      }],
      command: [`
        -O1 
        --lossy=${(1 - quality) * 100} 
        ${file.name} 
        -o /out/${file.name}
      `],
    }))[0]
    return convertBlobToType(compressedBlob, type, file.name)
  }
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-new
    new Compressor(file, {
      quality,
      success: async (compressedBlob: Blob | File) => {
        try {
          const result = await convertBlobToType(compressedBlob as Blob, type, file.name)
          resolve(result)
        }
        catch (error) {
          reject(error)
        }
      },
      error: reject,
    })
  })
}

export default compress
