<script setup lang="ts">
import {
  CloseBold,
  Download,
  FolderOpened,
  Loading,
  Picture,
  Upload,
} from '@element-plus/icons-vue'
import GitForkVue from '@simon_he/git-fork-vue'
import { ElMessage } from 'element-plus'
import 'img-comparison-slider/dist/styles.css'
import { download } from 'lazy-js-utils'
import { h } from 'vue'
import { compress } from '../../src'

// 导入 img-comparison-slider
import('img-comparison-slider')

// 单个图片的状态接口
interface ImageItem {
  id: string
  file: File
  originalUrl: string
  compressedUrl?: string
  originalSize: number
  compressedSize?: number
  compressionRatio?: number
  isCompressing: boolean
  compressionError?: string
  quality: number // 每张图片独立的质量设置
}

// 响应式状态
const loading = ref(false)
const downloading = ref(false)
const fileRef = ref()
const isDragOver = ref(false)
const currentImageIndex = ref(0)
const isCompressingAll = ref(false)
const isMobileDragging = ref(false)
const isPCDragging = ref(false) // PC端拖拽状态 // 移动端拖拽状态

// 全局配置
const preserveExif = ref(false) // EXIF 信息保留选项

// 图片列表状态
const imageItems = ref<ImageItem[]>([])
const supportType = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/gif',
  'image/webp',
]

// 检查并过滤不支持的文件，显示提示信息
function filterAndNotifyUnsupportedFiles(files: File[]): File[] {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  const supportedFiles = imageFiles.filter((file) =>
    supportType.includes(file.type),
  )
  const unsupportedFiles = imageFiles.filter(
    (file) => !supportType.includes(file.type),
  )

  // 如果有不支持的图片格式，显示详细提示
  if (unsupportedFiles.length > 0) {
    const unsupportedDetails = unsupportedFiles.map((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown'
      return {
        name: file.name,
        extension: extension.toUpperCase(),
        type: file.type || 'unknown',
      }
    })

    const unsupportedFormats = [
      ...new Set(unsupportedDetails.map((detail) => detail.extension)),
    ]

    ElMessage({
      message: h('div', [
        h(
          'div',
          { style: 'font-weight: 600; margin-bottom: 6px' },
          `已过滤 ${unsupportedFiles.length} 个不支持的图片文件:`,
        ),
        h(
          'div',
          { style: 'font-size: 13px; margin-bottom: 4px; color: #f56565' },
          `不支持的格式: ${unsupportedFormats.join(', ')}`,
        ),
        unsupportedFiles.length <= 3
          ? h(
              'div',
              { style: 'font-size: 12px; margin-bottom: 6px; opacity: 0.8' },
              unsupportedFiles.map((f) => f.name).join(', '),
            )
          : h(
              'div',
              { style: 'font-size: 12px; margin-bottom: 6px; opacity: 0.8' },
              `${unsupportedFiles
                .slice(0, 2)
                .map((f) => f.name)
                .join(', ')} 等 ${unsupportedFiles.length} 个文件`,
            ),
        h(
          'div',
          {
            style:
              'font-size: 12px; opacity: 0.7; border-top: 1px solid #e2e8f0; padding-top: 4px',
          },
          '✅ 支持的格式: PNG, JPG, JPEG, GIF, WebP',
        ),
      ]),
      type: 'warning',
      duration: 5000,
    })
  }

  // 如果有非图片文件，也提示
  const nonImageFiles = files.filter((file) => !file.type.startsWith('image/'))
  if (nonImageFiles.length > 0) {
    ElMessage({
      message: h('div', [
        h('div', `📁 检测到 ${nonImageFiles.length} 个非图片文件已被过滤`),
        nonImageFiles.length <= 3
          ? h(
              'div',
              { style: 'font-size: 12px; margin-top: 4px; opacity: 0.8' },
              nonImageFiles.map((f) => f.name).join(', '),
            )
          : h(
              'div',
              { style: 'font-size: 12px; margin-top: 4px; opacity: 0.8' },
              `${nonImageFiles
                .slice(0, 2)
                .map((f) => f.name)
                .join(', ')} 等文件`,
            ),
      ]),
      type: 'info',
      duration: 3000,
    })
  }

  return supportedFiles
}

// 计算属性
const hasImages = computed(() => imageItems.value.length > 0)
const currentImage = computed(() => imageItems.value[currentImageIndex.value])
const totalOriginalSize = computed(() =>
  imageItems.value.reduce((sum, item) => sum + item.originalSize, 0),
)
const totalCompressedSize = computed(() =>
  imageItems.value.reduce((sum, item) => sum + (item.compressedSize || 0), 0),
)

const totalCompressionRatio = computed(() => {
  if (totalOriginalSize.value === 0) return 0
  return (
    ((totalOriginalSize.value - totalCompressedSize.value) /
      totalOriginalSize.value) *
    100
  )
})
const compressedCount = computed(
  () =>
    imageItems.value.filter(
      (item) => item.compressedUrl && !item.compressionError,
    ).length,
)
const allCompressed = computed(
  () =>
    imageItems.value.length > 0 &&
    compressedCount.value === imageItems.value.length,
)

// 注册事件监听器
onMounted(() => {
  fileRef.value!.addEventListener('change', handleFileInputChange)

  // 添加全局拖拽事件监听
  document.addEventListener('dragover', handleDragOver)
  document.addEventListener('drop', handleDrop)
  document.addEventListener('dragenter', handleDragEnter)
  document.addEventListener('dragleave', handleDragLeave)

  // 添加粘贴事件监听
  document.addEventListener('paste', handlePaste)

  // 添加移动端触摸事件监听
  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchend', handleTouchEnd, { passive: true })
  document.addEventListener('touchcancel', handleTouchEnd, { passive: true })

  // 添加PC端鼠标事件监听
  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('dragover', handleDragOver)
  document.removeEventListener('drop', handleDrop)
  document.removeEventListener('dragenter', handleDragEnter)
  document.removeEventListener('dragleave', handleDragLeave)
  document.removeEventListener('paste', handlePaste)

  // 清理移动端触摸事件监听器
  document.removeEventListener('touchstart', handleTouchStart)
  document.removeEventListener('touchend', handleTouchEnd)
  document.removeEventListener('touchcancel', handleTouchEnd)

  // 清理PC端鼠标事件监听器
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('mouseup', handleMouseUp)

  // 清理对象URL
  imageItems.value.forEach((item) => {
    URL.revokeObjectURL(item.originalUrl)
    if (item.compressedUrl) {
      URL.revokeObjectURL(item.compressedUrl)
    }
  })
})

// 移动端触摸事件处理
function handleTouchStart(e: TouchEvent) {
  // 检查触摸是否在图片比较滑块上
  const target = e.target as HTMLElement
  if (
    target.closest('img-comparison-slider') ||
    target.closest('.comparison-slider-fullscreen')
  ) {
    isMobileDragging.value = true
    console.log('touch start')
  }
}

function handleTouchEnd(e: TouchEvent) {
  // 触摸结束时恢复显示
  isMobileDragging.value = false
  console.log('touch end')
}

// PC端鼠标事件处理
function handleMouseDown(e: MouseEvent) {
  // 检查鼠标按下是否在图片比较滑块上
  const target = e.target as HTMLElement
  if (
    target.closest('img-comparison-slider') ||
    target.closest('.comparison-slider-fullscreen')
  ) {
    isPCDragging.value = true
    console.log('mouse down on slider')
  }
}

function handleMouseUp(e: MouseEvent) {
  // 鼠标松开时恢复显示
  isPCDragging.value = false
  console.log('mouse up')
}

// 拖拽事件处理
function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.items) {
    // 检查是否包含图片文件或文件夹
    const hasImageOrFolder = Array.from(e.dataTransfer.items).some(
      (item) =>
        (item.kind === 'file' && item.type.startsWith('image/')) ||
        (item.kind === 'file' && item.type === ''),
    )
    if (hasImageOrFolder) {
      isDragOver.value = true
    }
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  // 只有当离开整个应用区域时才设置为false
  if (
    !e.relatedTarget ||
    !document.querySelector('.app-container')?.contains(e.relatedTarget as Node)
  ) {
    isDragOver.value = false
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false

  loading.value = true

  try {
    let files: File[] = []

    console.log('=== Drop Event Debug ===')
    console.log('dataTransfer.items:', e.dataTransfer?.items)
    console.log('dataTransfer.files:', e.dataTransfer?.files)
    console.log('items length:', e.dataTransfer?.items?.length)
    console.log('files length:', e.dataTransfer?.files?.length)

    // 首先尝试使用 DataTransferItemList API（支持文件夹）
    const items = e.dataTransfer?.items
    if (items && items.length > 0) {
      console.log('使用 DataTransferItemList API')
      files = await extractFilesFromDataTransfer(items)
      console.log(
        'extractFilesFromDataTransfer 结果:',
        files.length,
        files.map((f) => f.name),
      )
    }

    // 如果上面的方法没有获取到文件，回退到传统的 files API
    if (files.length === 0 && e.dataTransfer?.files) {
      console.log('回退到传统 files API')
      files = Array.from(e.dataTransfer.files)
      console.log(
        '传统 API 结果:',
        files.length,
        files.map((f) => f.name),
      )
    }

    if (files.length === 0) {
      console.warn('没有找到任何文件')
      ElMessage({
        message: 'No files found. Please try again.',
        type: 'warning',
      })
      return
    }

    const imageFiles = filterAndNotifyUnsupportedFiles(files)
    console.log(
      '过滤后的图片文件:',
      imageFiles.length,
      imageFiles.map((f) => f.name),
    )

    if (imageFiles.length === 0) {
      ElMessage({
        message: '没有找到支持的图片文件',
        type: 'warning',
      })
      return
    }

    await addNewImages(imageFiles)

    ElMessage({
      message: `Successfully loaded ${imageFiles.length} image(s)`,
      type: 'success',
    })
  } catch (error) {
    console.error('Error processing dropped files:', error)
    ElMessage({
      message: 'Error processing files. Please try again.',
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

// 粘贴事件处理
async function handlePaste(e: ClipboardEvent) {
  e.preventDefault()

  const items = e.clipboardData?.items
  if (!items || items.length === 0) {
    return
  }

  console.log('=== Paste Event Debug ===')
  console.log('clipboardData.items:', items)
  console.log('items length:', items.length)

  loading.value = true

  try {
    let files: File[] = []

    // 方法1: 首先尝试使用 webkitGetAsEntry API（支持文件夹）
    await Promise.all(
      Array.from(items).map(async (item, i) => {
        console.log(`处理剪贴板 Item ${i}:`, {
          kind: item.kind,
          type: item.type,
          webkitGetAsEntry: !!item.webkitGetAsEntry,
        })

        if (item.kind === 'file') {
          // 尝试使用 webkitGetAsEntry 获取文件系统入口
          const entry = item.webkitGetAsEntry?.()
          console.log(`Item ${i} webkitGetAsEntry:`, entry)

          if (entry) {
            console.log(`Item ${i} 使用 processEntry`)
            const itemFiles: File[] = []
            await processEntry(entry, itemFiles)
            console.log(
              `Item ${i} processEntry 完成，文件数:`,
              itemFiles.length,
              itemFiles.map((f) => f.name),
            )
            files.push(...itemFiles)
          } else {
            // 回退到传统文件API
            console.log(`Item ${i} 回退到 getAsFile`)
            const file = item.getAsFile()
            if (file) {
              console.log(`剪贴板文件 ${i}:`, file.name, file.type, file.size)
              files.push(file)
            } else {
              console.log(`Item ${i} getAsFile 返回 null`)
            }
          }
        } else {
          console.log(`Item ${i} 不是文件类型, kind: ${item.kind}`)
        }
      }),
    )

    console.log(
      `总共收集到 ${files.length} 个文件:`,
      files.map((f) => f.name),
    )

    // 过滤图片文件
    const imageFiles = filterAndNotifyUnsupportedFiles(files)
    console.log(
      '剪贴板过滤后的图片文件:',
      imageFiles.length,
      imageFiles.map((f) => f.name),
    )

    if (imageFiles.length === 0) {
      console.log('剪贴板中没有找到支持的图片文件')
      return // 静默处理，不显示错误消息
    }

    await addNewImages(imageFiles)

    ElMessage({
      message: `Successfully pasted ${imageFiles.length} image(s)`,
      type: 'success',
    })
  } catch (error) {
    console.error('Error processing pasted files:', error)
    ElMessage({
      message: 'Error processing pasted files. Please try again.',
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

// 从DataTransfer中提取所有文件（包括文件夹中的文件）
async function extractFilesFromDataTransfer(
  items: DataTransferItemList,
): Promise<File[]> {
  console.log('extractFilesFromDataTransfer 开始处理', items.length, '个 items')
  return await extractFilesFromItems(items)
}

// 通用的文件提取函数，支持拖拽和粘贴
async function extractFilesFromItems(
  items: DataTransferItemList,
): Promise<File[]> {
  console.log('extractFilesFromItems 开始处理', items.length, '个 items')

  const promises: Promise<File[]>[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    console.log(`处理 Item ${i}:`, { kind: item.kind, type: item.type })

    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry?.()
      console.log(`Item ${i} webkitGetAsEntry:`, entry)

      if (entry) {
        console.log(`Item ${i} 使用 processEntry`)
        const itemFiles: File[] = []
        promises.push(
          processEntry(entry, itemFiles).then(() => {
            console.log(
              `Item ${i} processEntry 完成，文件数:`,
              itemFiles.length,
              itemFiles.map((f) => f.name),
            )
            return itemFiles
          }),
        )
      } else {
        // 回退到传统文件API - 当webkitGetAsEntry返回null时
        console.log(`Item ${i} 回退到 getAsFile`)
        const file = item.getAsFile()
        if (file) {
          console.log(`Item ${i} getAsFile 成功:`, file.name)
          promises.push(Promise.resolve([file]))
        } else {
          console.log(`Item ${i} getAsFile 失败`)
          promises.push(Promise.resolve([]))
        }
      }
    }
  }

  // 等待所有文件处理完成
  const allFileArrays = await Promise.all(promises)
  const files = allFileArrays.flat()

  console.log(
    'extractFilesFromItems 完成，总共',
    files.length,
    '个文件:',
    files.map((f) => f.name),
  )
  return files
}

// 递归处理文件和文件夹
async function processEntry(
  entry: FileSystemEntry,
  files: File[],
): Promise<void> {
  console.log(
    'processEntry 开始处理:',
    entry.name,
    entry.isFile,
    entry.isDirectory,
  )

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry
    console.log('处理文件:', fileEntry.name)

    try {
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject)
      })
      console.log('成功获取文件:', file.name, file.size, file.type)
      files.push(file)
      console.log('当前文件数组长度:', files.length)
    } catch (error) {
      console.error('获取文件失败:', fileEntry.name, error)
    }
  } else if (entry.isDirectory) {
    console.log('处理目录:', entry.name)
    const dirEntry = entry as FileSystemDirectoryEntry
    const reader = dirEntry.createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })

    console.log('目录中的条目数:', entries.length)
    for (const childEntry of entries) {
      await processEntry(childEntry, files)
    }
  }

  console.log('processEntry 完成:', entry.name, '当前总文件数:', files.length)
}

// 文件输入框变化处理
async function handleFileInputChange() {
  const selectedFiles = Array.from(fileRef.value.files || []) as File[]
  if (selectedFiles.length > 0) {
    loading.value = true

    try {
      const imageFiles = filterAndNotifyUnsupportedFiles(selectedFiles)

      if (imageFiles.length === 0) {
        ElMessage({
          message: '没有找到支持的图片文件',
          type: 'warning',
        })
        return
      }

      await addNewImages(imageFiles)

      ElMessage({
        message: `Successfully loaded ${imageFiles.length} image(s)`,
        type: 'success',
      })
    } finally {
      loading.value = false
      // 清空文件输入框的值，确保可以重复选择同一文件
      fileRef.value.value = ''
    }
  }
}

// 添加新图片到列表
async function addNewImages(files: File[]) {
  const newItems: ImageItem[] = files.map((file) => ({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    file,
    originalUrl: URL.createObjectURL(file),
    originalSize: file.size,
    isCompressing: false,
    quality: 60, // 默认质量
  }))
  // 自动开始压缩所有新添加的图片
  await compressImages(newItems)
  imageItems.value.push(...newItems)
}

// 压缩单个图片
async function compressImage(item: ImageItem): Promise<void> {
  if (item.isCompressing) return

  item.isCompressing = true
  item.compressionError = undefined

  try {
    const compressedBlob = await compress(item.file, {
      quality: item.quality / 100, // 使用图片自己的质量设置
      type: 'blob',
      preserveExif: preserveExif.value, // 使用全局 EXIF 保留设置
    })

    if (!compressedBlob) {
      ElMessage({
        message: 'size is too large',
        type: 'error',
      })
      return
    }

    if (item.compressedUrl) {
      URL.revokeObjectURL(item.compressedUrl)
    }

    item.compressedUrl = URL.createObjectURL(compressedBlob)
    item.compressedSize = compressedBlob.size
    item.compressionRatio =
      ((item.originalSize - compressedBlob.size) / item.originalSize) * 100

    // 为当前图片优化渲染性能
  } catch (error) {
    console.error('Compression error:', error)
    item.compressionError =
      error instanceof Error ? error.message : 'Compression failed'
  } finally {
    item.isCompressing = false
  }
}

// 批量压缩图片
async function compressImages(items: ImageItem[] = imageItems.value) {
  isCompressingAll.value = true

  try {
    // 并发压缩，但限制并发数量避免性能问题
    const batchSize = 3
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      await Promise.all(batch.map((item) => compressImage(item)))
    }
  } finally {
    isCompressingAll.value = false
  }
}

// 单张图片质量改变处理
async function handleImageQualityChange(item: ImageItem, newQuality: number) {
  item.quality = newQuality
  await compressImage(item)
}

// 处理 EXIF 保留选项变化
async function handlePreserveExifChange() {
  // 重新压缩所有已存在的图片，使用新的 EXIF 设置
  for (const item of imageItems.value) {
    if (!item.isCompressing) {
      await compressImage(item)
    }
  }
}

// 删除单个图片
function deleteImage(index: number) {
  const item = imageItems.value[index]
  URL.revokeObjectURL(item.originalUrl)
  if (item.compressedUrl) {
    URL.revokeObjectURL(item.compressedUrl)
  }

  imageItems.value.splice(index, 1)

  // 调整当前图片索引
  if (currentImageIndex.value >= imageItems.value.length) {
    currentImageIndex.value = Math.max(0, imageItems.value.length - 1)
  }
}

// 清空所有图片
function clearAllImages() {
  imageItems.value.forEach((item) => {
    URL.revokeObjectURL(item.originalUrl)
    if (item.compressedUrl) {
      URL.revokeObjectURL(item.compressedUrl)
    }
  })

  imageItems.value = []
  currentImageIndex.value = 0
}

// 上传图片
function uploadImages() {
  document.getElementById('file')?.click()
}

// 下载单个图片
async function downloadImage(item: ImageItem) {
  if (!item.compressedUrl) return

  try {
    const originalName = item.file.name
    const lastDotIndex = originalName.lastIndexOf('.')
    const nameWithoutExt =
      lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName
    const extension =
      lastDotIndex > 0 ? originalName.substring(lastDotIndex) : ''
    const compressedFileName = `${nameWithoutExt}_compressed${extension}`

    download(item.compressedUrl, compressedFileName)

    ElMessage({
      message: `Downloaded: ${compressedFileName}`,
      type: 'success',
      duration: 2000,
    })
  } catch (error) {
    ElMessage({
      message: 'Download failed. Please try again.',
      type: 'error',
    })
  }
}

// 批量下载所有图片
async function downloadAllImages() {
  if (downloading.value) return

  const downloadableItems = imageItems.value.filter(
    (item) => item.compressedUrl && !item.compressionError,
  )
  if (downloadableItems.length === 0) {
    ElMessage({
      message: 'No compressed images to download',
      type: 'warning',
    })
    return
  }

  downloading.value = true

  try {
    // 添加延迟显示加载状态
    await new Promise((resolve) => setTimeout(resolve, 300))

    for (const item of downloadableItems) {
      await downloadImage(item)
      // 添加小延迟避免浏览器下载限制
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    ElMessage({
      message: h('div', { style: 'line-height: 1.5;' }, [
        h(
          'div',
          { style: 'color: #16a34a; font-weight: 500; margin-bottom: 4px;' },
          `Successfully downloaded ${downloadableItems.length} images!`,
        ),
        h(
          'div',
          {
            style: `color: ${totalCompressionRatio.value < 0 ? '#dc2626' : '#059669'}; font-size: 13px; font-family: monospace; background: ${totalCompressionRatio.value < 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(5, 150, 105, 0.1)'}; padding: 2px 6px; border-radius: 4px;`,
          },
          `Total ${totalCompressionRatio.value < 0 ? 'increased' : 'saved'}: ${totalCompressionRatio.value < 0 ? '+' : ''}${Math.abs(totalCompressionRatio.value).toFixed(1)}%`,
        ),
      ]),
      type: 'success',
      duration: 4000,
    })
  } catch (error) {
    ElMessage({
      message: 'Batch download failed. Please try again.',
      type: 'error',
    })
  } finally {
    downloading.value = false
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

// 切换当前预览图片
function setCurrentImage(index: number) {
  currentImageIndex.value = index
}
</script>

<template>
  <div class="app-container" :class="{ 'drag-over': isDragOver }">
    <!-- 拖拽覆盖层 -->
    <div v-show="isDragOver" class="drag-overlay">
      <div class="drag-message">
        <el-icon class="drag-icon">
          <FolderOpened />
        </el-icon>
        <div class="drag-text">Drop images or folders here</div>
        <div class="drag-subtitle">
          Support multiple images and folder drag & drop • Or use Ctrl+V to
          paste
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-show="loading || isCompressingAll" class="loading-overlay">
      <div class="loading-spinner">
        <el-icon class="is-loading" size="40px">
          <Loading />
        </el-icon>
        <div class="loading-text">
          {{ loading ? 'Loading images...' : 'Compressing images...' }}
        </div>
      </div>
    </div>

    <!-- Background Elements -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1" />
      <div class="bg-circle bg-circle-2" />
      <div class="bg-circle bg-circle-3" />
    </div>

    <GitForkVue
      link="https://github.com/Simon-He95/browser-compress-image"
      position="right"
      type="corners"
      content="Star on GitHub"
      color="#667eea"
    />

    <!-- Header -->
    <header class="header-section">
      <div class="title-container">
        <vivid-typing content="Browser Compress Image" class="main-title" />
        <p class="subtitle">
          Compress your images with ease, right in your browser • Support batch
          processing
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- 初始上传区域 - 仅在没有图片时显示 -->
      <section v-if="!hasImages" class="upload-zone">
        <button class="upload-btn-hero" @click="uploadImages">
          <el-icon class="upload-icon">
            <Picture />
          </el-icon>
          <span class="upload-text">Drop, Paste or Click to Upload Images</span>
          <span class="upload-hint">
            Support PNG, JPG, JPEG, GIF formats • Multiple files & folders
            supported • Use Ctrl+V to paste images
          </span>
        </button>
      </section>

      <!-- 简化的工具栏 - 仅在有图片时显示 -->
      <div v-if="hasImages" class="floating-toolbar">
        <div class="toolbar-section files-section">
          <div class="files-info">
            <div class="files-icon">📷</div>
            <span class="files-count">{{ imageItems.length }} image(s)</span>
            <span class="compressed-count"
              >({{ compressedCount }} compressed)</span
            >
          </div>

          <div class="action-buttons">
            <button
              class="action-btn add-btn"
              title="Add More Images"
              @click="uploadImages"
            >
              <div class="btn-icon">
                <el-icon>
                  <Upload />
                </el-icon>
              </div>
              <span class="btn-text">Add More</span>
            </button>
            <button
              class="action-btn delete-btn"
              title="Clear All Images"
              @click="clearAllImages"
            >
              <div class="btn-icon">
                <el-icon>
                  <CloseBold />
                </el-icon>
              </div>
              <span class="btn-text">Clear All</span>
            </button>
          </div>
        </div>

        <div class="toolbar-divider" />

        <div class="toolbar-section stats-section">
          <div class="stats-info">
            <span class="size-label"
              >Total: {{ formatFileSize(totalOriginalSize) }} →
              {{ formatFileSize(totalCompressedSize) }}</span
            >
            <span
              class="saved-mini"
              :class="{ 'saved-negative': totalCompressionRatio < 0 }"
            >
              {{ totalCompressionRatio < 0 ? '+' : '-'
              }}{{ Math.abs(totalCompressionRatio).toFixed(1) }}%
            </span>
          </div>
        </div>

        <div class="toolbar-divider" />

        <div class="toolbar-section options-section">
          <div class="exif-option">
            <el-checkbox
              v-model="preserveExif"
              @change="handlePreserveExifChange"
            >
              <span class="exif-label">Preserve EXIF</span>
            </el-checkbox>
          </div>
        </div>

        <div v-if="allCompressed" class="toolbar-divider" />

        <div v-if="allCompressed" class="toolbar-section download-section">
          <button
            class="download-btn-new"
            :class="[{ downloading }]"
            :disabled="downloading"
            title="Download All Compressed Images"
            @click="downloadAllImages"
          >
            <div class="download-btn-content">
              <div class="download-icon">
                <el-icon v-if="!downloading">
                  <Download />
                </el-icon>
                <el-icon v-else class="is-loading">
                  <Loading />
                </el-icon>
              </div>
              <span class="download-text">
                {{
                  downloading
                    ? 'Downloading...'
                    : `Download All (${compressedCount})`
                }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- 图片列表和预览区域 -->
      <section v-if="hasImages" class="images-section">
        <!-- 图片列表缩略图 -->
        <div class="images-grid">
          <div
            v-for="(item, index) in imageItems"
            :key="item.id"
            class="image-card"
            :class="{ active: index === currentImageIndex }"
            @click="setCurrentImage(index)"
          >
            <div class="image-preview">
              <img
                style="object-fit: contain"
                :src="item.originalUrl"
                :alt="item.file.name"
              />
              <div v-if="item.isCompressing" class="compressing-overlay">
                <el-icon class="is-loading">
                  <Loading />
                </el-icon>
              </div>
              <div v-if="item.compressionError" class="error-overlay">
                <span class="error-text">Error</span>
              </div>
            </div>
            <div class="image-info">
              <div class="image-name">
                {{ item.file.name }}
              </div>
              <div class="image-stats">
                <span class="original-size">{{
                  formatFileSize(item.originalSize)
                }}</span>
                <span class="compressed-size">
                  → {{ formatFileSize(item.compressedSize || 0) }}
                </span>
                <span
                  class="ratio"
                  :class="{
                    'ratio-negative': (item.compressionRatio || 0) < 0,
                  }"
                >
                  ({{ (item.compressionRatio || 0) < 0 ? '+' : '-'
                  }}{{ Math.abs(item.compressionRatio || 0).toFixed(1) }}%)
                </span>
              </div>
              <!-- 独立的质量控制 -->
              <div class="image-quality-control">
                <span class="quality-label-small"
                  >Quality: {{ item.quality }}%</span
                >
                <el-slider
                  v-model="item.quality"
                  :max="100"
                  :step="1"
                  :min="1"
                  class="image-quality-slider"
                  :show-tooltip="false"
                  size="small"
                  @change="(val: number) => handleImageQualityChange(item, val)"
                />
              </div>
            </div>
            <div class="image-actions">
              <button
                v-if="item.compressedUrl && !item.compressionError"
                class="action-btn-small download-single"
                title="Download this image"
                @click.stop="downloadImage(item)"
              >
                <el-icon>
                  <Download />
                </el-icon>
              </button>
              <button
                class="action-btn-small delete-single"
                title="Remove this image"
                @click.stop="deleteImage(index)"
              >
                <el-icon>
                  <CloseBold />
                </el-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- 全屏图片对比预览 -->
        <div v-if="currentImage" class="fullscreen-comparison">
          <div class="comparison-container-fullscreen">
            <!-- 调试信息 -->
            <div
              v-if="!currentImage.originalUrl || !currentImage.compressedUrl"
              class="debug-info"
            >
              <p>调试信息:</p>
              <p>
                originalUrl:
                {{ currentImage.originalUrl ? '已加载' : '未加载' }}
              </p>
              <p>
                compressedUrl:
                {{ currentImage.compressedUrl ? '已加载' : '未加载' }}
              </p>
              <p>
                originalSize: {{ formatFileSize(currentImage.originalSize) }}
              </p>
              <p>
                compressedSize:
                {{
                  currentImage.compressedSize
                    ? formatFileSize(currentImage.compressedSize)
                    : '未压缩'
                }}
              </p>
              <p>isCompressing: {{ currentImage.isCompressing }}</p>
              <p>
                compressionError:
                {{ currentImage.compressionError || '无错误' }}
              </p>
            </div>

            <!-- 主要的图片对比组件 -->
            <img-comparison-slider
              v-if="currentImage.originalUrl && currentImage.compressedUrl"
              class="comparison-slider-fullscreen"
              value="50"
            >
              <!-- eslint-disable -->
              <img
                slot="first"
                :src="currentImage.originalUrl"
                alt="Original Image"
                class="comparison-image-fullscreen"
                loading="eager"
                decoding="sync"
                style="
                  opacity: 1;
                  visibility: visible;
                  transition: none;
                  animation: none;
                  filter: none;
                "
                @load="console.log('原图加载完成')"
                @error="console.error('原图加载失败')"
              />
              <img
                slot="second"
                :src="currentImage.compressedUrl"
                alt="Compressed Image"
                class="comparison-image-fullscreen"
                loading="eager"
                decoding="sync"
                style="
                  opacity: 1;
                  visibility: visible;
                  transition: none;
                  animation: none;
                  filter: none;
                "
                @load="console.log('压缩图加载完成')"
                @error="console.error('压缩图加载失败')"
              />
              <!-- eslint-enable -->
            </img-comparison-slider>

            <!-- 仅显示原图（压缩中或出错时） -->
            <div
              v-else-if="currentImage.originalUrl"
              class="single-image-preview"
            >
              <img
                :src="currentImage.originalUrl"
                :alt="currentImage.file.name"
                class="single-image"
              />
              <div v-if="currentImage.isCompressing" class="preview-overlay">
                <el-icon class="is-loading" size="30px">
                  <Loading />
                </el-icon>
                <div class="overlay-text">Compressing...</div>
              </div>
              <div
                v-if="currentImage.compressionError"
                class="preview-overlay error"
              >
                <div class="overlay-text">Compression Error</div>
                <div class="overlay-subtext">
                  {{ currentImage.compressionError }}
                </div>
              </div>
            </div>

            <!-- 图片信息覆盖层 -->
            <div
              class="image-overlay-info"
              :class="{
                'mobile-dragging': isMobileDragging,
                'pc-dragging': isPCDragging,
              }"
            >
              <div class="image-title">
                {{ currentImage.file.name }}
              </div>
              <div class="image-details">
                <span
                  >{{ currentImageIndex + 1 }} / {{ imageItems.length }}</span
                >
                <span>Quality: {{ currentImage.quality }}%</span>
                <span>{{ formatFileSize(currentImage.originalSize) }}</span>
                <span v-if="currentImage.compressedSize">
                  → {{ formatFileSize(currentImage.compressedSize) }}
                </span>
                <span
                  v-if="currentImage.compressionRatio"
                  class="savings"
                  :class="{
                    'savings-negative': currentImage.compressionRatio < 0,
                  }"
                >
                  ({{ currentImage.compressionRatio < 0 ? '+' : '-'
                  }}{{ Math.abs(currentImage.compressionRatio).toFixed(1) }}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <input
      id="file"
      ref="fileRef"
      type="file"
      accept="image/png,image/jpg,image/jpeg,image/gif,image/webp"
      multiple
      hidden
    />
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow-x: hidden;
  overflow-y: hidden; /* PC端禁用垂直滚动 */
  /* 优化滚动性能 */
  -webkit-overflow-scrolling: touch;
  /* 减少重绘 */
  transform: translateZ(0);
  will-change: scroll-position;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.app-container.drag-over {
  background: linear-gradient(135deg, #667eea 20%, #764ba2 80%);
}

/* 拖拽覆盖层 */
.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.drag-message {
  text-align: center;
  color: white;
  padding: 40px;
  border: 3px dashed rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.drag-icon {
  font-size: 64px;
  opacity: 0.9;
  display: block;
}

.drag-text {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

.drag-subtitle {
  font-size: 14px;
  opacity: 0.7;
  font-weight: 400;
  line-height: 1.6;
  margin: 0;
  text-align: center;
  max-width: 320px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* Background Decoration */
.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.05)
  );
  animation: float 6s ease-in-out infinite;
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  top: 10%;
  left: -5%;
  animation-delay: 0s;
}

.bg-circle-2 {
  width: 200px;
  height: 200px;
  top: 60%;
  right: -5%;
  animation-delay: 2s;
}

.bg-circle-3 {
  width: 150px;
  height: 150px;
  top: 80%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }

  33% {
    transform: translateY(-20px) rotate(120deg);
  }

  66% {
    transform: translateY(10px) rotate(240deg);
  }
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(102, 126, 234, 0.95),
    rgba(118, 75, 162, 0.95)
  );
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  text-align: center;
  color: white;
}

.loading-text {
  margin-top: 16px;
  font-size: 18px;
  font-weight: 500;
}

/* Header */
.header-section {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 60px 20px 40px;
}

.title-container {
  width: 100%;
  margin: 0 auto;
}

.main-title {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(45deg, #fff, #e0e7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  font-weight: 300;
  margin: 0;
}

/* Main Content */
.main-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  max-width: 100vw;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0; /* 允许弹性项目缩小 */
  overflow-y: auto; /* 内容区域可滚动 */
  overflow-x: hidden;
}

/* 英雄上传区域 */
.upload-zone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.upload-btn-hero {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  padding: 60px 40px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  min-width: 400px;
  text-align: center;
}

.upload-btn-hero:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-4px);
}

.upload-icon {
  font-size: 48px;
  opacity: 0.8;
}

.upload-text {
  font-size: 20px;
  font-weight: 700;
}

.upload-hint {
  font-size: 14px;
  opacity: 0.7;
  font-weight: 400;
  line-height: 1.4;
}

/* 悬浮工具栏 */
.floating-toolbar {
  margin: auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 90vw;
  overflow: hidden;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.toolbar-divider {
  width: 1px;
  height: 32px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(0, 0, 0, 0.1),
    transparent
  );
  margin: 0 6px;
}

/* 图片列表和预览区域 */
.images-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 0;
  gap: 20px;
  overflow: visible;
}

/* 文件信息区域 */
.files-section {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 200px;
}

.files-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.files-icon {
  font-size: 16px;
  opacity: 0.8;
}

.files-count {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}

.compressed-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
}

.action-buttons {
  display: flex;
  gap: 6px;
}

.action-btn {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  transition: left 0.5s;
}

.action-btn:hover::before {
  left: 100%;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #374151;
  transition: transform 0.2s ease;
}

.btn-text {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.add-btn {
  border-color: rgba(59, 130, 246, 0.2);
}

.add-btn:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.add-btn:hover .btn-icon {
  transform: scale(1.1);
  color: #2563eb;
}

.add-btn:hover .btn-text {
  color: #2563eb;
}

.delete-btn {
  border-color: rgba(239, 68, 68, 0.2);
}

.delete-btn:hover {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: rgba(239, 68, 68, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.delete-btn:hover .btn-icon {
  transform: scale(1.1);
  color: #dc2626;
}

.delete-btn:hover .btn-text {
  color: #dc2626;
}

.action-btn:active {
  transform: translateY(0px) scale(0.98);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 质量控制区域 */
.quality-section {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 100px;
}

.quality-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quality-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quality-value {
  font-size: 14px;
  color: #374151;
  font-weight: 700;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.quality-slider-wrapper {
  width: 90px;
}

.mini-slider {
  --el-slider-height: 5px;
  --el-slider-button-size: 16px;
  --el-slider-main-bg-color: linear-gradient(135deg, #4f46e5, #7c3aed);
  --el-slider-runway-bg-color: rgba(0, 0, 0, 0.1);
}

/* 确保 mini-slider 滑轨可点击 */
.mini-slider :deep(.el-slider__runway) {
  height: 8px; /* 增加点击区域高度 */
  cursor: pointer;
  position: relative;
  z-index: 1;
}

/* 确保整个 mini-slider 容器都可交互 */
.mini-slider :deep(.el-slider) {
  position: relative;
  z-index: 1;
  padding: 10px 0; /* 增加上下padding，扩大点击区域 */
}

/* 工具栏滑块按钮样式 */
.mini-slider :deep(.el-slider__button) {
  background: #4f46e5;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
  cursor: pointer;
  z-index: 2;
}

.mini-slider :deep(.el-slider__button:hover) {
  background: #6366f1;
  border-color: #ffffff;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
  transform: scale(1.1);
}

/* 确保 mini-slider 按钮包装器也有足够的点击区域 */
.mini-slider :deep(.el-slider__button-wrapper) {
  cursor: pointer;
  z-index: 2;
}

/* 统计信息区域 */
.stats-section {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.stats-info {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 45px;
  min-width: 280px; /* 防止数字变化时工具栏抖动 */
}

.size-label {
  font-size: 11px;
  color: #374151;
  font-weight: 500;
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
}

.saved-mini {
  font-size: 11px;
  color: #16a34a;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    rgba(34, 197, 94, 0.1),
    rgba(34, 197, 94, 0.2)
  );
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid rgba(34, 197, 94, 0.2);
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);
  transition: all 0.2s ease;
}

.saved-mini.saved-negative {
  color: #dc2626;
  background: linear-gradient(
    135deg,
    rgba(220, 38, 38, 0.1),
    rgba(220, 38, 38, 0.2)
  );
  border: 1px solid rgba(220, 38, 38, 0.2);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
}

/* 选项区域 */
.options-section {
  justify-content: center;
  min-width: 120px;
}

.exif-option {
  display: flex;
  align-items: center;
  height: 45px;
}

.exif-label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  margin-left: 6px;
}

/* 下载按钮区域 */
.download-section {
  justify-content: center;
}

.download-btn-new {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
}

.download-btn-new::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.6s;
}

.download-btn-new:hover::before {
  left: 100%;
}

.download-btn-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.35);
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

.download-btn-new:active {
  transform: translateY(0px) scale(0.98);
}

.download-btn-new.downloading {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.2);
}

.download-btn-new.downloading:hover {
  transform: none;
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.2);
}

.download-btn-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.download-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.download-text {
  font-size: 13px;
  font-weight: 600;
}

/* 全屏图片对比区域 */
.fullscreen-comparison {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: visible;
}

.comparison-container-fullscreen {
  width: 100%;
  min-height: 450px;
  height: 450px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.comparison-slider-fullscreen {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  --divider-width: 3px;
  --divider-color: rgba(255, 255, 255, 0.8);
  --default-handle-width: 48px;
  --default-handle-color: rgba(255, 255, 255, 0.9);
}

.comparison-image-fullscreen {
  width: 100%;
  height: 450px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.05);
  opacity: 1 !important;
  visibility: visible !important;
  transition: none !important;
  animation: none !important;
  filter: none !important;
  /* 渲染优化 */
  transform: translateZ(0);
  backface-visibility: hidden;
  image-rendering: crisp-edges;
  -webkit-backface-visibility: hidden;
}

/* PC端样式优化 - 避免滚动条 */
@media (min-width: 769px) {
  .app-container {
    overflow-y: hidden; /* PC端完全禁用滚动 */
    height: 100vh;
    max-height: 100vh;
  }

  .main-content {
    overflow-y: auto; /* 只有主内容区域可滚动 */
    max-height: calc(100vh - 120px); /* 减去header高度 */
  }

  .header-section {
    flex-shrink: 0; /* 确保header不会被压缩 */
    height: auto;
    min-height: 120px;
  }

  /* 当有图片时，进一步优化布局 */
  .image-display-section {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-container {
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 100vh;
    height: auto;
  }

  .drag-overlay {
    padding: 20px;
  }

  .drag-message {
    padding: 30px;
  }

  .drag-icon {
    font-size: 48px;
  }

  .drag-text {
    font-size: 18px;
  }

  .header-section {
    padding: 40px 20px 20px;
  }

  .title-container {
    max-width: 600px;
  }

  .main-title {
    font-size: 2.5rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .floating-toolbar {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
    margin: 20px;
    border-radius: 16px;
    padding: 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    max-width: none;
  }

  .toolbar-section {
    justify-content: center;
  }

  .images-section {
    padding: 10px;
    overflow: visible;
  }

  .images-grid {
    padding: 0 20px;
    height: 180px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .image-card {
    flex: 0 0 120px;
    width: 120px;
  }

  .image-preview {
    height: 60px;
  }

  .floating-toolbar {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
    margin: 20px;
    border-radius: 16px;
    padding: 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    max-width: none;
  }

  .toolbar-section {
    justify-content: center;
  }

  .files-section {
    align-items: center;
    flex-direction: column;
    justify-content: center;
    min-width: auto;
    gap: 8px;
  }

  .files-info {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .action-buttons {
    flex-direction: row;
  }

  .stats-section {
    align-items: center;
    flex-direction: row;
    justify-content: center;
  }

  .options-section {
    align-items: center;
    flex-direction: row;
    justify-content: center;
    min-width: auto;
  }

  .toolbar-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(0, 0, 0, 0.1),
      transparent
    );
    margin: 0;
  }

  .stats-info {
    min-width: 220px; /* 移动端使用较小的最小宽度 */
    justify-content: center;
  }

  .upload-btn-hero {
    min-width: auto;
    width: 100%;
    max-width: 350px;
  }

  .fullscreen-comparison {
    height: auto;
    margin-top: 20px;
    padding: 10px;
    overflow: visible;
  }

  .comparison-container-fullscreen,
  .comparison-image-fullscreen {
    min-height: 250px;
    height: 300px;
    display: flex;
  }

  .fullscreen-comparison {
    height: auto;
    max-height: none;
    padding: 10px;
    overflow: auto;
  }

  .comparison-container-fullscreen {
    max-height: 70vh;
    display: flex;
  }
}

@media (max-width: 480px) {
  .floating-toolbar {
    padding: 10px;
    gap: 10px;
  }

  .action-btn {
    padding: 8px 12px;
  }

  .btn-text {
    font-size: 12px;
  }

  .quality-slider-wrapper {
    width: 80px;
  }

  .download-btn-new {
    padding: 12px 16px;
  }

  .download-text {
    font-size: 14px;
  }
}

/* 全局防闪烁规则 */
img-comparison-slider,
img-comparison-slider *,
.comparison-image-fullscreen,
.comparison-slider-fullscreen {
  opacity: 1 !important;
  visibility: visible !important;
  transition: none !important;
  animation: none !important;
  filter: none !important;
  -webkit-filter: none !important;
}

/* 防止浏览器默认的图片加载动画 */
img-comparison-slider img {
  opacity: 1 !important;
  visibility: visible !important;
  transition: none !important;
  animation: none !important;
  filter: none !important;
  -webkit-filter: none !important;
  transform: translateZ(0) !important;
  will-change: auto !important;
}

/* 自定义全屏滑块样式 */
:deep(.comparison-slider-fullscreen .handle) {
  background: rgba(255, 255, 255, 0.9);
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

:deep(.comparison-slider-fullscreen .handle:hover) {
  transform: scale(1.1);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3);
}

:deep(.comparison-slider-fullscreen .divider) {
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

/* 图片网格 */
.images-grid {
  display: flex;
  gap: 12px;
  height: 280px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.images-grid::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.images-grid::-webkit-scrollbar-track {
  background: transparent;
}

.images-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.images-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 图片卡片 */
.image-card {
  background: transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex: 0 0 150px;
  width: 150px;
}

.image-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
}

.image-card.active {
  border-color: #667eea;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

/* 图片预览 */
.image-preview {
  position: relative;
  width: 100%;
  height: 80px;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-card:hover .image-preview img {
  transform: scale(1.05);
}

/* 压缩中覆盖层 */
.compressing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

/* 错误覆盖层 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(239, 68, 68, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.error-text {
  font-size: 12px;
  font-weight: 600;
}

/* 图片信息 */
.image-info {
  padding: 8px;
  background: white;
}

.image-name {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 10px;
  color: #6b7280;
  margin-bottom: 6px;
}

/* 图片质量控制 */
.image-quality-control {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative; /* 确保正确的层级关系 */
}

/* 确保按钮包装器不会干扰点击 */
:deep(.image-quality-control .el-slider__button-wrapper) {
  top: 50%;
  transform: translateY(-50%) translateX(-50%);
  height: fit-content;
  width: fit-content;
  display: flex;
  cursor: pointer;
  z-index: 3; /* 确保按钮在最上层 */
}

.quality-label-small {
  font-size: 9px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.image-quality-slider {
  --el-slider-height: 6px;
  --el-slider-button-size: 12px;
  --el-slider-main-bg-color: linear-gradient(135deg, #4f46e5, #7c3aed);
  --el-slider-runway-bg-color: rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 120px;
}

/* 确保滑轨可点击 */
.image-quality-slider :deep(.el-slider__runway) {
  height: 6px; /* 增加点击区域高度 */
  cursor: pointer;
  position: relative;
  z-index: 1;
}

/* 确保整个滑动条容器都可交互 */
.image-quality-slider :deep(.el-slider) {
  position: relative;
  z-index: 1;
  padding: 8px 0; /* 增加上下padding，扩大点击区域 */
}

/* 自定义滑块按钮样式 */
.image-quality-slider :deep(.el-slider__button) {
  background: #4f46e5;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
  cursor: pointer;
  z-index: 2;
}

.image-quality-slider :deep(.el-slider__button:hover) {
  background: #6366f1;
  border-color: #ffffff;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
  transform: scale(1.1);
}

/* 确保按钮包装器也有足够的点击区域 */
.image-quality-slider :deep(.el-slider__button-wrapper) {
  cursor: pointer;
  z-index: 2;
}

.original-size {
  font-weight: 500;
}

.compressed-size {
  color: #059669;
  font-weight: 500;
}

.ratio {
  color: #16a34a;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  transition: color 0.2s ease;
}

.ratio.ratio-negative {
  color: #dc2626;
}

/* 图片操作按钮 */
.image-actions {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #f8fafc;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.action-btn-small {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex: 1;
}

.action-btn-small:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.download-single {
  color: #059669;
  border-color: rgba(5, 150, 105, 0.2);
}

.download-single:hover {
  background: #ecfdf5;
  border-color: rgba(5, 150, 105, 0.4);
}

.delete-single {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.2);
}

.delete-single:hover {
  background: #fef2f2;
  border-color: rgba(220, 38, 38, 0.4);
}

/* 调试信息样式 */
.debug-info {
  color: white;
  padding: 20px;
  background: rgba(255, 0, 0, 0.3);
  margin: 10px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.4;
}

.debug-info p {
  margin: 5px 0;
}

/* 单图预览 */
.single-image-preview {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
}

.single-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* 预览覆盖层 */
.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.preview-overlay.error {
  background: rgba(239, 68, 68, 0.9);
}

.overlay-text {
  font-size: 18px;
  font-weight: 600;
  margin-top: 10px;
}

.overlay-subtext {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 5px;
  text-align: center;
  max-width: 300px;
}

/* 图片信息覆盖层 */
.image-overlay-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  padding: 20px;
  backdrop-filter: blur(10px);
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease;
  pointer-events: none;
}

/* 移动端拖拽时隐藏信息层 */
.image-overlay-info.mobile-dragging {
  opacity: 0;
  visibility: hidden;
}

/* PC端拖拽时隐藏信息层 */
.image-overlay-info.pc-dragging {
  opacity: 0;
  visibility: hidden;
}

.image-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-details {
  display: flex;
  gap: 12px;
  font-size: 13px;
  opacity: 0.9;
  flex-wrap: wrap;
}

.image-details .savings {
  color: #4ade80;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  transition: color 0.2s ease;
}

.image-details .savings.savings-negative {
  color: #dc2626;
}
</style>
