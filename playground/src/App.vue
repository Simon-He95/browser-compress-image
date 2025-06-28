<script setup lang="ts">
import { CloseBold, Download, Loading, Upload } from '@element-plus/icons-vue'
import GitForkVue from '@simon_he/git-fork-vue'
import { ElMessage } from 'element-plus'
import { download } from 'lazy-js-utils'
import { h } from 'vue'
import { compress } from '../../src'
import 'img-comparison-slider/dist/styles.css'

// 导入 img-comparison-slider
import('img-comparison-slider')

const originSize = ref<string>()
const compressSize = ref<string>()
const oldbase = ref<string>()
const newbase = ref<string>()
const quality = ref(60)
const file = ref<File>()
const loading = ref(false)
const downloading = ref(false)
const fileRef = ref()
const imageAspectRatio = ref<number>(1)
const isDragOver = ref(false)

const oldSrcList = ref<string[]>([])
const newSrcList = ref<string[]>([])
const supportType = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif']

// 注册 img-comparison-slider 组件
onMounted(() => {
  fileRef.value!.addEventListener('change', update)

  // 添加全局拖拽事件监听
  document.addEventListener('dragover', handleDragOver)
  document.addEventListener('drop', handleDrop)
  document.addEventListener('dragenter', handleDragEnter)
  document.addEventListener('dragleave', handleDragLeave)
})

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('dragover', handleDragOver)
  document.removeEventListener('drop', handleDrop)
  document.removeEventListener('dragenter', handleDragEnter)
  document.removeEventListener('dragleave', handleDragLeave)
})

// 拖拽事件处理
function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.items) {
    // 检查是否包含图片文件
    const hasImageFile = Array.from(e.dataTransfer.items).some(item =>
      item.kind === 'file' && item.type.startsWith('image/'),
    )
    if (hasImageFile) {
      isDragOver.value = true
    }
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  // 只有当离开整个应用区域时才设置为false
  if (!e.relatedTarget || !document.querySelector('.app-container')?.contains(e.relatedTarget as Node)) {
    isDragOver.value = false
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const imageFile = Array.from(files).find(file =>
      supportType.includes(file.type),
    )
    if (imageFile) {
      // 自动替换当前图片
      processNewFile(imageFile)
    }
    else {
      ElMessage({
        message: 'Please drop a valid image file (PNG, JPG, JPEG, GIF)',
        type: 'warning',
      })
    }
  }
}

// 处理新文件的通用函数
async function processNewFile(newFile: File) {
  // 清理之前的URL对象，防止内存泄漏
  if (oldbase.value) {
    URL.revokeObjectURL(oldbase.value)
  }
  if (newbase.value) {
    URL.revokeObjectURL(newbase.value)
  }

  // 重置状态
  deleteHandler()

  // 设置新文件
  file.value = newFile
  loading.value = true
  await compressImage()
  loading.value = false
}

function deleteHandler() {
  newbase.value = ''
  oldbase.value = ''
  file.value = undefined
  compressSize.value = ''
}

async function compressImage() {
  if (!file.value)
    return
  const type = file.value.type
  if (!supportType.includes(type)) {
    deleteHandler()
    return ElMessage({
      message: `${type}格式还不支持`,
      type: 'error',
    })
  }

  const compressFile = await compress(file.value, {
    quality: quality.value / 100,
    type: 'blob',
  })
  if (!compressFile) {
    return ElMessage({
      message: 'size is too large',
      type: 'error',
    })
  }
  originSize.value = (file.value.size / 1024 / 1024).toFixed(2)
  compressSize.value = (compressFile.size / 1024 / 1024).toFixed(2)
  oldbase.value = URL.createObjectURL(file.value)
  oldSrcList.value = [oldbase.value]
  newbase.value = URL.createObjectURL(compressFile)
  newSrcList.value = [newbase.value]

  console.log('压缩完成:', {
    originSize: originSize.value,
    compressSize: compressSize.value,
    oldbase: oldbase.value,
    newbase: newbase.value,
  })

  // 计算图片的长宽比并优化渲染
  const img = new Image()
  img.onload = () => {
    imageAspectRatio.value = img.width / img.height
    console.log('图片加载完成，长宽比:', imageAspectRatio.value)
    // 延迟执行渲染优化
    nextTick(() => {
      optimizeImageRendering()
    })
  }
  img.src = oldbase.value
}

// 优化图片渲染性能，减少滚动时的模糊
function optimizeImageRendering() {
  console.log('开始优化图片渲染')

  // 等待DOM更新
  setTimeout(() => {
    const images = document.querySelectorAll('.comparison-image-fullscreen, img-comparison-slider img')
    console.log('找到图片数量:', images.length)

    images.forEach((img, index) => {
      if (img instanceof HTMLImageElement) {
        console.log(`优化第${index + 1}张图片:`, img.src)
        // 强制硬件加速和高质量渲染
        img.style.transform = 'translateZ(0)'
        img.style.backfaceVisibility = 'hidden'
        img.style.imageRendering = 'crisp-edges'
        img.style.webkitBackfaceVisibility = 'hidden'
        // 立即设置正确的显示状态，防止暗到亮的闪烁
        img.style.opacity = '1'
        img.style.visibility = 'visible'
        img.style.transition = 'none'
        img.style.animation = 'none'
        img.style.filter = 'none'
        // 强制重绘以确保立即生效
        img.offsetHeight
      }
    })

    // 同时优化 img-comparison-slider 组件本身
    const sliders = document.querySelectorAll('img-comparison-slider')
    console.log('找到slider数量:', sliders.length)

    sliders.forEach((slider, index) => {
      if (slider instanceof HTMLElement) {
        console.log(`优化第${index + 1}个slider`)
        slider.style.opacity = '1'
        slider.style.visibility = 'visible'
        slider.style.transition = 'none'
        // 强制重绘
        slider.offsetHeight
      }
    })
  }, 100)
}

async function update() {
  const selectedFile = fileRef.value.files[0]
  if (selectedFile) {
    await processNewFile(selectedFile)
  }
}
function changeHandler(val: number) {
  quality.value = val
  // 直接重新压缩当前文件，而不是读取文件输入框
  if (file.value) {
    compressImage()
  }
}
const rate = computed(() => {
  return (
    ((+originSize.value! - +compressSize.value!) / +originSize.value! || 0) * 100
  ).toFixed(2)
})
function upload() {
  document.getElementById('file')?.click()
}

async function down() {
  if (downloading.value || !newbase.value || !file.value)
    return

  try {
    downloading.value = true

    // 添加一个小延迟来显示加载状态
    await new Promise(resolve => setTimeout(resolve, 300))

    // 生成压缩后的文件名
    const originalName = file.value.name
    const lastDotIndex = originalName.lastIndexOf('.')
    const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName
    const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : ''
    const compressedFileName = `${nameWithoutExt}_compressed${extension}`

    // 执行下载
    download(newbase.value, compressedFileName)

    // 显示成功消息
    ElMessage({
      message: h('div', { style: 'line-height: 1.5;' }, [
        h('div', { style: 'color: #16a34a; font-weight: 500; margin-bottom: 4px;' }, 'Image downloaded successfully!'),
        h('div', { style: 'color: #059669; font-size: 13px; font-family: monospace; background: rgba(5, 150, 105, 0.1); padding: 2px 6px; border-radius: 4px;' }, compressedFileName),
      ]),
      type: 'success',
      duration: 3000,
    })
  }
  catch (error) {
    ElMessage({
      message: 'Download failed. Please try again.',
      type: 'error',
    })
  }
  finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="app-container" :class="{ 'drag-over': isDragOver }">
    <!-- 拖拽覆盖层 -->
    <div v-show="isDragOver" class="drag-overlay">
      <div class="drag-message">
        <el-icon class="drag-icon">
          <Upload />
        </el-icon>
        <span class="drag-text">Drop your image here</span>
      </div>
    </div>
    <!-- Loading Overlay -->
    <div v-show="loading" class="loading-overlay">
      <div class="loading-spinner">
        <el-icon class="is-loading" size="40px">
          <Loading />
        </el-icon>
        <div class="loading-text">
          Compressing...
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
          Compress your images with ease, right in your browser
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- 初始上传区域 - 仅在没有图片时显示 -->
      <section v-if="!newbase" class="upload-zone">
        <button class="upload-btn-hero" @click="upload">
          <el-icon class="upload-icon">
            <Upload />
          </el-icon>
          <span class="upload-text">Drop or Click to Upload Image</span>
          <span class="upload-hint">Support PNG, JPG, JPEG, GIF formats • Drag & Drop supported</span>
        </button>
      </section>

      <!-- 悬浮工具栏 - 仅在有图片时显示 -->
      <div v-if="file" class="floating-toolbar">
        <div class="toolbar-section file-section">
          <div class="file-info">
            <div class="file-icon">
              📷
            </div>
            <span class="file-name-mini">{{ file?.name.length > 18 ? `${file?.name.substring(0, 18)}...` : file?.name }}</span>
          </div>
          <div class="action-buttons">
            <button class="action-btn replace-btn" title="Replace Image" @click="upload">
              <div class="btn-icon">
                <el-icon><Upload /></el-icon>
              </div>
              <span class="btn-text">Replace</span>
            </button>
            <button class="action-btn delete-btn" title="Remove Image" @click="deleteHandler">
              <div class="btn-icon">
                <el-icon><CloseBold /></el-icon>
              </div>
              <span class="btn-text">Remove</span>
            </button>
          </div>
        </div>

        <div class="toolbar-divider" />

        <div class="toolbar-section quality-section">
          <div class="quality-control">
            <span class="quality-label">Quality</span>
            <div class="quality-value">
              {{ quality }}%
            </div>
          </div>
          <div class="quality-slider-wrapper">
            <el-slider
              v-model="quality"
              :max="100"
              :step="5"
              class="mini-slider"
              :show-tooltip="false"
              size="small"
              @change="changeHandler"
            />
          </div>
        </div>

        <div v-if="compressSize" class="toolbar-divider" />

        <div v-if="compressSize" class="toolbar-section stats-section">
          <div class="stats-info">
            <div class="size-info">
              <span class="size-label">Size</span>
              <span class="stat-mini">{{ originSize }}MB → {{ compressSize }}MB</span>
            </div>
            <div class="savings-badge">
              <span class="saved-mini">-{{ rate }}%</span>
            </div>
          </div>
        </div>

        <div v-if="newbase" class="toolbar-divider" />

        <div v-if="newbase" class="toolbar-section download-section">
          <button
            class="download-btn-new" :class="[{ downloading }]"
            :disabled="downloading"
            title="Download Compressed Image"
            @click="down"
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
              <span class="download-text">{{ downloading ? 'Downloading...' : 'Download' }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 全屏图片对比区域 -->
      <section v-if="newbase" class="fullscreen-comparison">
        <div class="comparison-container-fullscreen">
          <!-- 调试信息 -->
          <div v-if="!oldbase || !newbase" class="debug-info">
            <p>调试信息:</p>
            <p>oldbase: {{ oldbase ? '已加载' : '未加载' }}</p>
            <p>newbase: {{ newbase ? '已加载' : '未加载' }}</p>
            <p>originSize: {{ originSize }}</p>
            <p>compressSize: {{ compressSize }}</p>
          </div>

          <!-- 主要的图片对比组件 -->
          <img-comparison-slider
            v-if="oldbase && newbase"
            class="comparison-slider-fullscreen"
            value="50"
          >
            <template #first>
              <img

                :src="oldbase"
                alt="Original Image"
                class="comparison-image-fullscreen"
                loading="eager"
                decoding="sync"
                style="opacity: 1; visibility: visible; transition: none; animation: none; filter: none;"
                @load="console.log('原图加载完成')"
                @error="console.error('原图加载失败')"
              >
            </template>
            <template #second>
              <img

                :src="newbase"
                alt="Compressed Image"
                class="comparison-image-fullscreen"
                loading="eager"
                decoding="sync"
                style="opacity: 1; visibility: visible; transition: none; animation: none; filter: none;"
                @load="console.log('压缩图加载完成')"
                @error="console.error('压缩图加载失败')"
              >
            </template>
          </img-comparison-slider>
        </div>
      </section>
    </main>

    <input id="file" ref="fileRef" type="file" accept="image/*" hidden>
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow: hidden;
  /* 优化滚动性能 */
  -webkit-overflow-scrolling: touch;
  /* 减少重绘 */
  transform: translateZ(0);
  will-change: scroll-position;
  transition: all 0.3s ease;
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
}

.drag-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.9;
}

.drag-text {
  font-size: 24px;
  font-weight: 600;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
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
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(120deg); }
  66% { transform: translateY(10px) rotate(240deg); }
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95));
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
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
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1), transparent);
  margin: 0 6px;
}

/* 文件信息区域 */
.file-section {
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 140px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 16px;
  opacity: 0.8;
}

.file-name-mini {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
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
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
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
  transition: transform 0.2s ease;
}

.btn-text {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.replace-btn {
  border-color: rgba(59, 130, 246, 0.2);
}

.replace-btn:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.replace-btn:hover .btn-icon {
  transform: scale(1.1);
  color: #2563eb;
}

.replace-btn:hover .btn-text {
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
  --el-slider-button-size: 14px;
  --el-slider-main-bg-color: linear-gradient(135deg, #4f46e5, #7c3aed);
  --el-slider-runway-bg-color: rgba(0, 0, 0, 0.1);
}

/* 统计信息区域 */
.stats-section {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.stats-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.size-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.size-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-mini {
  font-size: 12px;
  color: #374151;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
}

.savings-badge {
  align-self: flex-start;
}

.saved-mini {
  font-size: 11px;
  color: #16a34a;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.2));
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid rgba(34, 197, 94, 0.2);
  font-family: 'SF Mono', Monaco, 'Consolas', monospace;
  box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);
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
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
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
  max-height: calc(100vh - 200px);
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.comparison-container-fullscreen {
  width: 100%;
  height: 100%;
  max-width: 95vw;
  max-height: calc(100vh - 440px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-info {
  color: white;
  padding: 20px;
  background: rgba(255, 0, 0, 0.3);
  margin: 10px;
  border-radius: 8px;
  font-family: monospace;
}

.comparison-slider-fullscreen {
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 200px);
  --divider-width: 3px;
  --divider-color: rgba(255, 255, 255, 0.8);
  --default-handle-width: 48px;
  --default-handle-color: rgba(255, 255, 255, 0.9);
}

.comparison-image-fullscreen {
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 440px);
  object-fit: contain;
  background: rgba(0, 0, 0, 0.05);
  /* 防闪烁优化 */
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

/* 响应式设计 */
@media (max-width: 768px) {
  .app-container {
    overflow-y: auto;
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

  .file-section {
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
  }

  .action-buttons {
    flex-direction: row;
  }

  .quality-section {
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
  }

  .stats-section {
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
  }

  .toolbar-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.1), transparent);
    margin: 0;
  }

  .upload-btn-hero {
    min-width: auto;
    width: 100%;
    max-width: 350px;
  }

  .fullscreen-comparison {
    height: auto;
    min-height: 400px;
    max-height: none;
    margin-top: 60px;
    padding: 10px;
    overflow: auto;
  }

  .comparison-container-fullscreen {
    max-height: 70vh;
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
</style>
