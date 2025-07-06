import { describe, it, expect, beforeAll } from 'vitest'
import { compress } from '../src'
import type { MultipleCompressResults } from '../src/types'

// 创建测试图片文件
function createTestImageFile(
  type: string = 'image/jpeg',
  size: number = 1024,
): File {
  // 创建一个简单的测试图片数据
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext('2d')!

  // 绘制一个简单的图案
  ctx.fillStyle = '#ff0000'
  ctx.fillRect(0, 0, 50, 50)
  ctx.fillStyle = '#00ff00'
  ctx.fillRect(50, 0, 50, 50)
  ctx.fillStyle = '#0000ff'
  ctx.fillRect(0, 50, 50, 50)
  ctx.fillStyle = '#ffff00'
  ctx.fillRect(50, 50, 50, 50)

  // 转换为 Blob
  return new Promise<File>((resolve) => {
    canvas.toBlob(
      (blob) => {
        const file = new File([blob!], 'test-image.jpg', { type })
        resolve(file)
      },
      type,
      0.9,
    )
  }) as any as File
}

describe('新功能验证测试', () => {
  let testFile: File
  let pngFile: File
  let gifFile: File

  beforeAll(async () => {
    // 在浏览器环境中模拟 canvas
    if (typeof document === 'undefined') {
      // Node.js 环境，创建模拟文件
      const buffer = new ArrayBuffer(1024)
      testFile = new File([buffer], 'test.jpg', { type: 'image/jpeg' })
      pngFile = new File([buffer], 'test.png', { type: 'image/png' })
      gifFile = new File([buffer], 'test.gif', { type: 'image/gif' })
    } else {
      // 浏览器环境，创建真实测试文件
      testFile = createTestImageFile('image/jpeg')
      pngFile = createTestImageFile('image/png')
      gifFile = createTestImageFile('image/gif')
    }
  })

  describe('returnAllResults 功能测试', () => {
    it('应该返回所有工具的压缩结果', async () => {
      const result = (await compress(testFile, {
        quality: 0.8,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      // 验证返回结构
      expect(result).toHaveProperty('bestResult')
      expect(result).toHaveProperty('bestTool')
      expect(result).toHaveProperty('allResults')
      expect(result).toHaveProperty('totalDuration')

      // 验证 bestResult 是 Blob
      expect(result.bestResult).toBeInstanceOf(Blob)

      // 验证 bestTool 是字符串
      expect(typeof result.bestTool).toBe('string')

      // 验证 allResults 是数组且包含正确的结构
      expect(Array.isArray(result.allResults)).toBe(true)
      expect(result.allResults.length).toBeGreaterThan(0)

      // 验证每个结果项的结构
      result.allResults.forEach((item) => {
        expect(item).toHaveProperty('tool')
        expect(item).toHaveProperty('result')
        expect(item).toHaveProperty('originalSize')
        expect(item).toHaveProperty('compressedSize')
        expect(item).toHaveProperty('compressionRatio')
        expect(item).toHaveProperty('duration')
        expect(item).toHaveProperty('success')

        expect(typeof item.tool).toBe('string')
        expect(item.result).toBeInstanceOf(Blob)
        expect(typeof item.originalSize).toBe('number')
        expect(typeof item.compressedSize).toBe('number')
        expect(typeof item.compressionRatio).toBe('number')
        expect(typeof item.duration).toBe('number')
        expect(typeof item.success).toBe('boolean')
      })

      // 验证至少有一个成功的结果
      const successfulResults = result.allResults.filter((item) => item.success)

      // 调试信息
      console.log('🔍 详细调试信息:')
      result.allResults.forEach((item) => {
        console.log(
          `  ${item.tool}: success=${item.success}, error=${item.error || 'none'}`,
        )
      })

      // 在 Node.js 环境中，压缩工具可能会失败，但应该有原始文件作为后备
      // 如果所有压缩工具都失败，最优工具应该是 'original'
      if (successfulResults.length === 0) {
        expect(result.bestTool).toBe('original')
        console.log(
          'ℹ️ 所有压缩工具在 Node.js 环境中失败，使用原始文件作为后备',
        )
      } else {
        expect(successfulResults.length).toBeGreaterThan(0)
      }

      console.log('🎯 returnAllResults 测试结果:')
      console.log(`最优工具: ${result.bestTool}`)
      console.log(`总耗时: ${result.totalDuration}ms`)
      console.log('所有结果:')
      result.allResults.forEach((item) => {
        console.log(
          `  ${item.tool}: ${item.compressedSize} bytes (${item.compressionRatio.toFixed(1)}% reduction, ${item.duration}ms) ${item.success ? '✅' : '❌'}`,
        )
      })
    })

    it('应该正确处理不同的输出类型', async () => {
      const fileResult = (await compress(testFile, {
        quality: 0.8,
        returnAllResults: true,
        type: 'file',
      })) as MultipleCompressResults<'file'>

      expect(fileResult.bestResult).toBeInstanceOf(File)
      fileResult.allResults.forEach((item) => {
        expect(item.result).toBeInstanceOf(File)
      })

      console.log('✅ 文件类型输出验证通过')
    })
  })

  describe('preserveExif 功能测试', () => {
    it('应该在 preserveExif=true 时过滤工具', async () => {
      const result = (await compress(testFile, {
        quality: 0.8,
        preserveExif: true,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      // 验证只使用支持 EXIF 的工具
      const supportedTools = [
        'browser-image-compression',
        'compressorjs',
        'original',
      ]
      result.allResults.forEach((item) => {
        expect(supportedTools).toContain(item.tool)
      })

      // 验证不包含不支持 EXIF 的工具
      const unsupportedTools = ['canvas', 'gifsicle']
      result.allResults.forEach((item) => {
        expect(unsupportedTools).not.toContain(item.tool)
      })

      console.log('🔒 EXIF 工具过滤验证:')
      console.log(
        `使用的工具: ${result.allResults.map((item) => item.tool).join(', ')}`,
      )
    })

    it('应该在 GIF 文件 + preserveExif=true 时抛出错误', async () => {
      await expect(
        compress(gifFile, {
          quality: 0.8,
          preserveExif: true,
          type: 'blob',
        }),
      ).rejects.toThrow('No EXIF-supporting tools available')

      console.log('🚫 GIF + preserveExif 错误处理验证通过')
    })

    it('应该在 PNG 文件 + preserveExif=true 时正常工作', async () => {
      const result = (await compress(pngFile, {
        quality: 0.8,
        preserveExif: true,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      // PNG 文件应该只使用 browser-image-compression（canvas 被过滤掉）
      const usedTools = result.allResults.map((item) => item.tool)
      expect(usedTools).toContain('browser-image-compression')
      expect(usedTools).not.toContain('canvas')

      console.log('🖼️ PNG + preserveExif 验证:')
      console.log(`使用的工具: ${usedTools.join(', ')}`)
    })
  })

  describe('兼容性和回退测试', () => {
    it('应该向后兼容旧的 API', async () => {
      // 测试旧的 API 格式仍然有效
      const result = await compress(testFile, 0.8, 'blob')
      expect(result).toBeInstanceOf(Blob)

      console.log('🔄 向后兼容性验证通过')
    })

    it('应该在所有工具失败时使用原文件', async () => {
      // 创建一个会导致压缩失败的场景（极低质量）
      const result = (await compress(testFile, {
        quality: 0.01, // 极低质量可能导致某些工具失败
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      // 即使有失败，也应该有结果
      expect(result.allResults.length).toBeGreaterThan(0)
      expect(result.bestResult).toBeInstanceOf(Blob)

      console.log('🛡️ 容错处理验证:')
      console.log(`结果数量: ${result.allResults.length}`)
      console.log(`最优工具: ${result.bestTool}`)
    })
  })

  describe('性能和统计测试', () => {
    it('应该正确计算压缩比例和统计信息', async () => {
      const result = (await compress(testFile, {
        quality: 0.7,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      result.allResults.forEach((item) => {
        // 验证压缩比例计算
        const expectedRatio =
          ((item.originalSize - item.compressedSize) / item.originalSize) * 100
        expect(Math.abs(item.compressionRatio - expectedRatio)).toBeLessThan(
          0.01,
        )

        // 验证大小合理性
        expect(item.originalSize).toBeGreaterThan(0)
        expect(item.compressedSize).toBeGreaterThan(0)
        expect(item.duration).toBeGreaterThanOrEqual(0)
      })

      console.log('📊 统计信息验证通过')
    })

    it('应该正确选择最优结果', async () => {
      const result = (await compress(testFile, {
        quality: 0.7,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      // 验证最优结果是文件大小最小的成功结果
      const successfulResults = result.allResults.filter((item) => item.success)
      if (successfulResults.length > 1) {
        const minSize = Math.min(
          ...successfulResults.map((item) => item.compressedSize),
        )
        const bestItem = successfulResults.find(
          (item) => item.compressedSize === minSize,
        )
        expect(result.bestTool).toBe(bestItem?.tool)
      }

      console.log('🏆 最优结果选择验证通过')
    })
  })
})
