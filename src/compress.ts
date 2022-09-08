import Compressor from 'compressorjs'
import imageCompression from 'browser-image-compression'
export function compress(file: File, quality = 0.6): Promise<Blob> {
  return new Promise(async (resolve) => {
    if (file.type.endsWith('png')) {
      resolve(await imageCompression(file, {
        useWebWorker: true,
        initialQuality: quality,
      }))
    }
    else {
      new Compressor(file, {
        quality,
        success: resolve,
      })
    }
  })
}
