import { describe, it, expect } from 'vitest'
import { compress } from '../src'
import type { MultipleCompressResults } from '../src/types'

// 创建一个模拟的图片文件用于测试
function createMockImageFile(
  type: string = 'image/jpeg',
  size: number = 1024,
): File {
  // 创建一个简单的测试数据，模拟图片文件
  const buffer = new ArrayBuffer(size)
  const view = new Uint8Array(buffer)

  // 填充一些模拟的图片数据
  for (let i = 0; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256)
  }

  return new File([buffer], `test.${type.split('/')[1]}`, { type })
}

describe('新功能验证测试', () => {
  const testFile = createMockImageFile('image/jpeg', 2048)
  const pngFile = createMockImageFile('image/png', 1536)
  const gifFile = createMockImageFile('image/gif', 1024)
  const webpFile = createMockImageFile('image/webp', 1792)

  describe('returnAllResults 功能测试', () => {
    it('应该返回多结果对象结构', async () => {
      const result = await compress(testFile, {
        quality: 0.8,
        returnAllResults: true,
        type: 'blob',
      })

      // 验证是 MultipleCompressResults 类型
      expect(result).toHaveProperty('bestResult')
      expect(result).toHaveProperty('bestTool')
      expect(result).toHaveProperty('allResults')
      expect(result).toHaveProperty('totalDuration')

      const multiResult = result as MultipleCompressResults<'blob'>

      // 验证基本结构
      expect(multiResult.bestResult).toBeInstanceOf(Blob)
      expect(typeof multiResult.bestTool).toBe('string')
      expect(Array.isArray(multiResult.allResults)).toBe(true)
      expect(typeof multiResult.totalDuration).toBe('number')

      console.log('✅ 多结果结构验证通过')
      console.log(`最优工具: ${multiResult.bestTool}`)
      console.log(`结果数量: ${multiResult.allResults.length}`)
    })

    it('应该返回单一结果当 returnAllResults=false 时', async () => {
      const result = await compress(testFile, {
        quality: 0.8,
        returnAllResults: false,
        type: 'blob',
      })

      // 验证是单个 Blob
      expect(result).toBeInstanceOf(Blob)
      expect(result).not.toHaveProperty('allResults')

      console.log('✅ 单结果模式验证通过')
    })

    it('应该支持不同的输出类型', async () => {
      // 测试 file 类型
      const fileResult = (await compress(testFile, {
        quality: 0.8,
        returnAllResults: true,
        type: 'file',
      })) as MultipleCompressResults<'file'>

      expect(fileResult.bestResult).toBeInstanceOf(File)
      expect(
        fileResult.allResults.every((item) => item.result instanceof File),
      ).toBe(true)

      console.log('✅ 文件类型输出验证通过')
    })
  })

  describe('preserveExif 功能测试', () => {
    it('应该抛出错误当 GIF + preserveExif=true', async () => {
      await expect(
        compress(gifFile, {
          quality: 0.8,
          preserveExif: true,
          type: 'blob',
        }),
      ).rejects.toThrow('No EXIF-supporting tools available')

      console.log('✅ GIF + preserveExif 错误处理验证通过')
    })

    it('应该成功处理 JPEG + preserveExif=true', async () => {
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

      console.log('✅ JPEG + preserveExif 验证通过')
      console.log(
        `使用的工具: ${result.allResults.map((item) => item.tool).join(', ')}`,
      )
    })

    it('应该成功处理 PNG + preserveExif=true', async () => {
      const result = (await compress(pngFile, {
        quality: 0.8,
        preserveExif: true,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      // PNG 应该过滤掉 canvas 工具
      const usedTools = result.allResults.map((item) => item.tool)
      expect(usedTools).not.toContain('canvas')

      console.log('✅ PNG + preserveExif 验证通过')
      console.log(`使用的工具: ${usedTools.join(', ')}`)
    })

    it('应该成功处理 WebP + preserveExif=true', async () => {
      const result = (await compress(webpFile, {
        quality: 0.8,
        preserveExif: true,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      // WebP 应该过滤掉 canvas，只保留 browser-image-compression
      const usedTools = result.allResults.map((item) => item.tool)
      expect(usedTools).toContain('browser-image-compression')
      expect(usedTools).not.toContain('canvas')

      console.log('✅ WebP + preserveExif 验证通过')
      console.log(`使用的工具: ${usedTools.join(', ')}`)
    })
  })

  describe('类型安全和重载测试', () => {
    it('应该正确推断返回类型', async () => {
      // 测试类型推断
      const singleResult = await compress(testFile, {
        quality: 0.8,
        type: 'blob',
      })
      const multiResult = await compress(testFile, {
        quality: 0.8,
        returnAllResults: true,
        type: 'blob',
      })
      const legacyResult = await compress(testFile, 0.8, 'blob')

      expect(singleResult).toBeInstanceOf(Blob)
      expect(multiResult).toHaveProperty('allResults')
      expect(legacyResult).toBeInstanceOf(Blob)

      console.log('✅ 类型推断验证通过')
    })

    it('应该向后兼容旧的 API', async () => {
      // 测试旧 API 仍然工作
      const result1 = await compress(testFile, 0.8)
      const result2 = await compress(testFile, 0.7, 'blob')
      const result3 = await compress(testFile, 0.6, 'file')

      expect(result1).toBeInstanceOf(Blob)
      expect(result2).toBeInstanceOf(Blob)
      expect(result3).toBeInstanceOf(File)

      console.log('✅ 向后兼容性验证通过')
    })
  })

  describe('边界情况测试', () => {
    it('应该处理极高质量设置', async () => {
      const result = (await compress(testFile, {
        quality: 0.99,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      expect(result.bestResult).toBeInstanceOf(Blob)
      expect(result.allResults.length).toBeGreaterThan(0)

      console.log('✅ 极高质量设置验证通过')
      console.log(`最优工具: ${result.bestTool}`)
    })

    it('应该处理极低质量设置', async () => {
      const result = (await compress(testFile, {
        quality: 0.01,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      expect(result.bestResult).toBeInstanceOf(Blob)
      expect(result.allResults.length).toBeGreaterThan(0)

      console.log('✅ 极低质量设置验证通过')
      console.log(`最优工具: ${result.bestTool}`)
    })

    it('应该正确处理各种文件类型的工具选择', async () => {
      const fileTypes = [
        {
          file: testFile,
          type: 'JPEG',
          expectedTools: [
            'browser-image-compression',
            'compressorjs',
            'canvas',
          ],
        },
        {
          file: pngFile,
          type: 'PNG',
          expectedTools: ['browser-image-compression', 'canvas'],
        },
        {
          file: webpFile,
          type: 'WebP',
          expectedTools: ['canvas', 'browser-image-compression'],
        },
      ]

      for (const { file, type, expectedTools } of fileTypes) {
        const result = (await compress(file, {
          quality: 0.8,
          returnAllResults: true,
          type: 'blob',
        })) as MultipleCompressResults<'blob'>

        const usedTools = result.allResults
          .map((item) => item.tool)
          .filter((tool) => tool !== 'original')

        // 验证使用的工具在预期范围内
        usedTools.forEach((tool) => {
          expect(expectedTools).toContain(tool)
        })

        console.log(`✅ ${type} 文件工具选择验证通过: ${usedTools.join(', ')}`)
      }
    })
  })

  describe('数据完整性测试', () => {
    it('应该正确计算统计信息', async () => {
      const result = (await compress(testFile, {
        quality: 0.7,
        returnAllResults: true,
        type: 'blob',
      })) as MultipleCompressResults<'blob'>

      result.allResults.forEach((item) => {
        // 验证数据一致性
        expect(item.originalSize).toBe(testFile.size)
        expect(item.compressedSize).toBeGreaterThan(0)
        expect(typeof item.compressionRatio).toBe('number')
        expect(item.duration).toBeGreaterThanOrEqual(0)
        expect(typeof item.success).toBe('boolean')

        // 验证压缩比计算正确性
        const expectedRatio =
          ((item.originalSize - item.compressedSize) / item.originalSize) * 100
        expect(Math.abs(item.compressionRatio - expectedRatio)).toBeLessThan(
          0.01,
        )
      })

      console.log('✅ 统计信息计算验证通过')
    })

    it('应该保持文件名和类型信息', async () => {
      const result = (await compress(testFile, {
        quality: 0.8,
        returnAllResults: true,
        type: 'file',
      })) as MultipleCompressResults<'file'>

      result.allResults.forEach((item) => {
        if (item.success && item.result instanceof File) {
          expect(item.result.name).toBeTruthy()
          expect(item.result.type).toBeTruthy()
        }
      })

      console.log('✅ 文件信息保持验证通过')
    })
  })
})
