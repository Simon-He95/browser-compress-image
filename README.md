<div align="center">
  <img src="./assets/kv.png" width="120" alt="Browser Compress### 🎯 多工具压缩 - 自动选择最优结果

```typescript
import { compressWithMultipleTools } from '@simon_he/browser-compress-image'

// 使用多种压缩工具并行处理，自动选择最优结果
const result = await compressWithMultipleTools(file, {
  quality: 0.8,
  tools: ['browser-image-compression', 'compressorjs', 'canvas']
})

console.log('最优压缩工具:', result.bestTool)
console.log('压缩后文件:', result.compressedFile)
console.log('所有结果:', result.results)
```

### 📊 压缩性能统计

```typescript
import { compressWithStats } from '@simon_he/browser-compress-image'

// 获取详细的压缩统计信息，包括耗时和性能数据
const stats = await compressWithStats(file, { quality: 0.8 })

console.log('压缩统计:', {
  bestTool: stats.bestTool,              // 最优工具: "canvas"
  originalSize: stats.originalSize,       // 原始大小: 1024000 bytes
  compressedSize: stats.compressedSize,   // 压缩后大小: 512000 bytes
  compressionRatio: stats.compressionRatio, // 压缩比例: 50%
  totalDuration: stats.totalDuration,     // 总耗时: 1200ms
  toolsUsed: stats.toolsUsed             // 各工具详细性能数据
})

// 性能对比表格会在控制台自动显示
// ┌─────────┬──────────────────────┬───────────────┬──────────────┬─────────────┐
// │ (index) │        Tool          │ Size (bytes)  │ Reduction (%)│ Duration    │
// ├─────────┼──────────────────────┼───────────────┼──────────────┼─────────────┤
// │    0    │ 'canvas'             │    512000     │   '50.0%'    │   '800ms'   │
// │    1    │ 'browser-compression'│    520000     │   '49.2%'    │   '1200ms'  │
// └─────────┴──────────────────────┴───────────────┴──────────────┴─────────────┘
``` 
  # 🚀 Browser Compress Image
  
  <p align="center">
    <strong>轻量级、高性能的浏览器图片压缩库</strong>
  </p>
  
  <p align="center">
    支持 JPEG、PNG、GIF 格式 | 多种输出类型 | 完整 TypeScript 支持 | 零依赖
  </p>

  <p align="center">
    <a href="https://www.npmjs.com/package/@simon_he/browser-compress-image"><img src="https://img.shields.io/npm/v/@simon_he/browser-compress-image.svg?style=flat&colorA=18181B&colorB=28CF8D" alt="Version"></a>
    <a href="https://www.npmjs.com/package/@simon_he/browser-compress-image"><img src="https://img.shields.io/npm/dm/@simon_he/browser-compress-image.svg?style=flat&colorA=18181B&colorB=28CF8D" alt="Downloads"></a>
    <a href="https://github.com/Simon-He95/browser-compress-image"><img src="https://img.shields.io/github/stars/Simon-He95/browser-compress-image.svg?style=flat&colorA=18181B&colorB=28CF8D" alt="Stars"></a>
    <a href="https://github.com/Simon-He95/browser-compress-image/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Simon-He95/browser-compress-image.svg?style=flat&colorA=18181B&colorB=28CF8D" alt="License"></a>
  </p>
</div>

## ✨ 特性

### 🎯 核心功能

- **多格式支持** - JPEG、PNG、GIF、WebP 全覆盖
- **多输出类型** - Blob、File、Base64、ArrayBuffer 任你选择
- **多工具引擎** - 集成 CompressorJS、Canvas、browser-image-compression 等多种压缩算法
- **智能优选** - 自动比对多工具压缩结果，选择最优质量与体积的方案

### � 上传方式

- **拖拽上传** - 支持单文件/多文件拖拽，PC 和移动端友好
- **粘贴上传** - 直接 Ctrl+V 粘贴图片，快速便捷
- **文件夹上传** - 一键选择文件夹，批量处理图片
- **批量处理** - 同时处理多个图片文件，并行压缩

### 🔧 技术特性

- **轻量级** - 体积小巧，性能优异
- **TypeScript** - 完整类型支持，开发体验极佳
- **现代化 API** - 简洁易用的 async/await 接口
- **高性能** - 基于 WebWorker 的并行处理
- **灵活配置** - 自定义压缩质量和输出格式

## 🏆 为什么选择我们？

| 特性            | 我们 | 其他库 |
| --------------- | ---- | ------ |
| 多输出格式      | ✅   | ❌     |
| 多工具引擎比对  | ✅   | ❌     |
| TypeScript 支持 | ✅   | 部分   |
| GIF/WebP 压缩   | ✅   | 很少   |
| 批量/粘贴上传   | ✅   | ❌     |
| 文件夹上传      | ✅   | ❌     |
| 零配置使用      | ✅   | ❌     |
| 文档完善        | ✅   | 一般   |

## 📦 安装

```bash
# npm
npm install @simon_he/browser-compress-image

# yarn
yarn add @simon_he/browser-compress-image

# pnpm
pnpm add @simon_he/browser-compress-image
```

## 🚀 快速开始

### 基础用法

```typescript
import { compress } from '@simon_he/browser-compress-image'

// 压缩图片，默认返回 Blob
const compressedBlob = await compress(file, 0.6)
console.log('压缩完成！', compressedBlob)
```

### 🎯 多工具压缩 - 自动选择最优结果

```typescript
import { compressWithMultipleTools } from '@simon_he/browser-compress-image'

// 使用多种压缩工具并行处理，自动选择最优结果
const result = await compressWithMultipleTools(file, {
  quality: 0.8,
  tools: ['browser-image-compression', 'compressorjs', 'canvas'],
})

console.log('最优压缩工具:', result.bestTool)
console.log('压缩后文件:', result.compressedFile)
console.log('所有结果:', result.results)
```

### 📁 多文件批量处理

```typescript
// 批量压缩多个文件
const files = Array.from(fileInput.files)
const compressedFiles = await Promise.all(
  files.map((file) => compress(file, 0.7, 'file')),
)
```

### 📋 粘贴上传

```typescript
// 监听粘贴事件
document.addEventListener('paste', async (e) => {
  const items = Array.from(e.clipboardData?.items || [])
  const imageItems = items.filter((item) => item.type.startsWith('image/'))

  for (const item of imageItems) {
    const file = item.getAsFile()
    if (file) {
      const compressed = await compress(file, 0.6)
      // 处理压缩后的图片
    }
  }
})
```

### 📂 文件夹上传

```html
<!-- HTML 中设置 webkitdirectory 属性 -->
<input
  type="file"
  webkitdirectory
  multiple
  accept="image/*"
  @change="handleFolderUpload"
/>
```

````typescript
const handleFolderUpload = async (event: Event) => {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  const imageFiles = files.filter(file => file.type.startsWith('image/'))

  // 批量压缩文件夹中的所有图片
  const results = await Promise.all(
    imageFiles.map(async file => ({
      original: file,
      compressed: await compress(file, 0.7, 'file'),
      path: file.webkitRelativePath
    }))
  )
}

### 🎨 多种输出格式

```typescript
// 🔹 返回 Blob (默认)
const blob = await compress(file, 0.6, 'blob')

// 🔹 返回 File 对象，保留文件名
const file = await compress(originalFile, 0.6, 'file')

// 🔹 返回 Base64 字符串，直接用于 img src
const base64 = await compress(file, 0.6, 'base64')

// 🔹 返回 ArrayBuffer，用于进一步处理
const arrayBuffer = await compress(file, 0.6, 'arrayBuffer')
````

### 🎯 实际应用场景

#### 📸 上传前压缩

```typescript
const handleUpload = async (file: File) => {
  // 压缩为 File 对象，保留原文件名
  const compressedFile = await compress(file, 0.7, 'file')

  const formData = new FormData()
  formData.append('image', compressedFile)

  await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })
}
```

#### 🖼️ 图片预览

```typescript
const showPreview = async (file: File) => {
  // 压缩为 Base64，直接显示
  const base64 = await compress(file, 0.6, 'base64')

  const img = document.createElement('img')
  img.src = base64
  document.body.appendChild(img)
}
```

#### 💾 数据处理

```typescript
const processImageData = async (file: File) => {
  // 压缩为 ArrayBuffer，进行二进制处理
  const buffer = await compress(file, 0.8, 'arrayBuffer')

  // 发送到 WebSocket 或进行其他二进制操作
  websocket.send(buffer)
}
```

## 📚 API 文档

### compress 函数

```typescript
compress<T extends CompressResultType = 'blob'>(
  file: File,          // 要压缩的图片文件
  quality?: number,    // 压缩质量 (0-1)，默认 0.6
  type?: T            // 输出格式，默认 'blob'
): Promise<CompressResult<T>>
```

### compressWithStats 函数

```typescript
compressWithStats(
  file: File,                    // 要压缩的图片文件
  options?: CompressOptions      // 压缩选项（可选）
): Promise<CompressionStats>
```

返回详细的压缩统计信息，包括：

```typescript
interface CompressionStats {
  bestTool: string              // 最优压缩工具名称
  compressedFile: Blob          // 最优压缩结果
  originalSize: number          // 原始文件大小（字节）
  compressedSize: number        // 压缩后大小（字节）
  compressionRatio: number      // 压缩比例（百分比）
  totalDuration: number         // 总耗时（毫秒）
  toolsUsed: Array<{           // 各工具详细信息
    tool: string               // 工具名称
    size: number               // 压缩后大小
    duration: number           // 耗时
    compressionRatio: number   // 压缩比例
    success: boolean           // 是否成功
    error?: string             // 错误信息（如果失败）
  }>
}
```

#### 🛠️ 支持的压缩工具

| 工具                      | 标识符                        | 适用格式  | 特点                     |
| ------------------------- | ----------------------------- | --------- | ------------------------ |
| Browser Image Compression | `'browser-image-compression'` | JPEG, PNG | 快速压缩，兼容性好       |
| CompressorJS              | `'compressorjs'`              | JPEG, PNG | 轻量级，配置灵活         |
| Canvas                    | `'canvas'`                    | 所有格式  | 原生浏览器 API，通用性强 |
| Gifsicle                  | `'gifsicle'`                  | GIF       | GIF 专用压缩引擎         |

#### 📋 参数说明

| 参数      | 类型                 | 默认值   | 说明                               |
| --------- | -------------------- | -------- | ---------------------------------- |
| `file`    | `File`               | -        | 要压缩的图片文件                   |
| `quality` | `number`             | `0.6`    | 压缩质量，范围 0-1，值越小文件越小 |
| `type`    | `CompressResultType` | `'blob'` | 输出格式类型                       |

#### 🎯 支持的输出格式

| 格式            | 类型          | 说明                 | 使用场景            |
| --------------- | ------------- | -------------------- | ------------------- |
| `'blob'`        | `Blob`        | 二进制对象           | 文件上传、存储      |
| `'file'`        | `File`        | 文件对象，保留文件名 | 表单提交、文件系统  |
| `'base64'`      | `string`      | Base64 编码字符串    | 图片显示、数据传输  |
| `'arrayBuffer'` | `ArrayBuffer` | 二进制数据缓冲区     | WebSocket、底层处理 |

#### 🖼️ 支持的图片格式

- **JPEG** (.jpg, .jpeg) - 使用 browser-image-compression、CompressorJS、Canvas
- **PNG** (.png) - 使用 browser-image-compression、CompressorJS、Canvas
- **WebP** (.webp) - 使用 Canvas
- **GIF** (.gif) - 使用 gifsicle-wasm-browser
- **其他格式** - 使用 Canvas 和 CompressorJS 兜底

### 🎨 UI 交互功能

#### 📱 移动端和桌面端优化

- **智能拖拽** - 拖拽时自动隐藏信息层，提升视觉体验
- **响应式设计** - 完美适配各种屏幕尺寸
- **触摸友好** - 移动端手势操作优化

#### 📊 压缩统计显示

- **实时统计** - 显示原始大小、压缩后大小、节省空间
- **压缩比例** - 负数用红色显示，正数用绿色显示
- **批量统计** - 多文件压缩时显示总体统计信息

### TypeScript 类型支持

```typescript
import type {
  CompressResultType,
  CompressResult,
} from '@simon_he/browser-compress-image'

// 类型会根据第三个参数自动推断
const blob = await compress(file, 0.6, 'blob') // 类型: Blob
const file2 = await compress(file, 0.6, 'file') // 类型: File
const base64 = await compress(file, 0.6, 'base64') // 类型: string
const buffer = await compress(file, 0.6, 'arrayBuffer') // 类型: ArrayBuffer
```

## 📊 压缩效果对比

<div align="center">
  <img src="./assets/pic.png" alt="压缩效果对比" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
</div>

## 🤝 贡献

我们欢迎任何形式的贡献！

1. Fork 这个项目
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 🙏 致谢

本项目基于以下优秀的开源库构建：

- **核心压缩引擎**
  - [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) - 浏览器图片压缩核心
  - [compressorjs](https://github.com/fengyuanchen/compressorjs) - 轻量级图片压缩库
  - [gifsicle-wasm-browser](https://github.com/renzhezhilu/gifsicle-wasm-browser) - GIF 专用压缩支持

- **开发工具**
  - [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
  - [Vite](https://vitejs.dev/) - 现代化构建工具
  - [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
  - [UnoCSS](https://unocss.dev/) - 即时原子化 CSS 引擎

## 📄 许可证

[MIT](./LICENSE) License © 2022-2025 [Simon He](https://github.com/Simon-He95)

---

<div align="center">
  <p>如果这个项目对你有帮助，请给个 ⭐️ 支持一下！</p>
  <p>Made with ❤️ by <a href="https://github.com/Simon-He95">Simon He</a></p>
</div>
