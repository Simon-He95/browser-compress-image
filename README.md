<div align="center">
  <img src="./assets/kv.png" width="120" alt="Browser Compress Image Logo">
  
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

- 🎯 **多格式支持** - JPEG、PNG、GIF 全覆盖
- 🔄 **多输出类型** - Blob、File、Base64、ArrayBuffer 任你选择
- 📦 **轻量级** - 体积小巧，性能优异
- 🛡️ **TypeScript** - 完整类型支持，开发体验极佳
- 🎨 **现代化 API** - 简洁易用的 async/await 接口
- ⚡ **高性能** - 基于 WebWorker 的并行处理
- 🔧 **灵活配置** - 自定义压缩质量和输出格式

## 🏆 为什么选择我们？

| 特性            | 我们 | 其他库 |
| --------------- | ---- | ------ |
| 多输出格式      | ✅   | ❌     |
| TypeScript 支持 | ✅   | 部分   |
| GIF 压缩        | ✅   | 很少   |
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
```

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

- **JPEG** (.jpg, .jpeg) - 使用 browser-image-compression
- **PNG** (.png) - 使用 browser-image-compression
- **GIF** (.gif) - 使用 gifsicle-wasm-browser
- **其他格式** - 使用 compressorjs

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

- [compressorjs](https://github.com/fengyuanchen/compressorjs) - JPEG/PNG 压缩
- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) - 图片压缩核心
- [gifsicle-wasm-browser](https://github.com/renzhezhilu/gifsicle-wasm-browser) - GIF 压缩支持

## 📄 许可证

[MIT](./LICENSE) License © 2022-2025 [Simon He](https://github.com/Simon-He95)

---

<div align="center">
  <p>如果这个项目对你有帮助，请给个 ⭐️ 支持一下！</p>
  <p>Made with ❤️ by <a href="https://github.com/Simon-He95">Simon He</a></p>
</div>
