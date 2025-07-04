import type { CompressResult, CompressResultType } from './types'

// 辅助函数：将 Blob 转换为不同格式
export default async function convertBlobToType<T extends CompressResultType>(
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
