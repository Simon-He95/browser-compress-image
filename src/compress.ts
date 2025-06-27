import imageCompression from 'browser-image-compression'
import Compressor from 'compressorjs'
import gifsicle from 'gifsicle-wasm-browser'

export async function compress(file: File, quality = 0.6): Promise<Blob> {
  if (file.type.endsWith('png')) {
    return Promise.resolve(await imageCompression(file, {
      useWebWorker: true,
      initialQuality: quality,
    }))
  }
  else if (file.type.endsWith('gif')) {
    return Promise.resolve((await gifsicle.run({
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
  return new Promise((resolve) => {
    // eslint-disable-next-line no-new
    new Compressor(file, {
      quality,
      success: resolve,
    })
  })
}
