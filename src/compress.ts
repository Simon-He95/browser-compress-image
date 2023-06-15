import Compressor from 'compressorjs'
import imageCompression from 'browser-image-compression'
import gifsicle from 'gifsicle-wasm-browser'

export function compress(file: File, quality = 0.6): Promise<Blob> {
  return new Promise(async (resolve) => {
    if (file.type.endsWith('png')) {
      resolve(await imageCompression(file, {
        useWebWorker: true,
        initialQuality: quality,
      }))
    }
    else if (file.type.endsWith('gif')) {
      resolve((await gifsicle.run({
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
      }))[0])
    }
    else {
      new Compressor(file, {
        quality,
        success: resolve,
      })
    }
  })
}
