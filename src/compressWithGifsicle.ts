import gifsicle from 'gifsicle-wasm-browser'

// gifsicle 工具
export default async function compressWithGifsicle(
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
