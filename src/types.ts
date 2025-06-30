export type CompressResultType = 'blob' | 'file' | 'base64' | 'arrayBuffer'

export type CompressResult<T extends CompressResultType> = T extends 'blob'
  ? Blob
  : T extends 'file'
    ? File
    : T extends 'base64'
      ? string
      : T extends 'arrayBuffer'
        ? ArrayBuffer
        : never

export interface CompressOptions {
  /**
   * 压缩质量 (0-1)
   * @default 0.6
   */
  quality?: number

  /**
   * 压缩模式
   * - 'keepSize': 保持图片尺寸不变 (如100x100输入，输出仍为100x100)，只改变文件大小
   * - 'keepQuality': 保持图片质量不变，但可以改变尺寸
   * @default 'keepSize'
   */
  mode?: 'keepSize' | 'keepQuality'

  /**
   * 目标宽度 (仅在 keepQuality 模式下生效)
   */
  targetWidth?: number

  /**
   * 目标高度 (仅在 keepQuality 模式下生效)
   */
  targetHeight?: number

  /**
   * 最大宽度 (仅在 keepQuality 模式下生效)
   */
  maxWidth?: number

  /**
   * 最大高度 (仅在 keepQuality 模式下生效)
   */
  maxHeight?: number

  /**
   * 返回结果类型
   * @default 'blob'
   */
  type?: CompressResultType
}
