# 使用示例

## 基础用法（返回 Blob）

```typescript
import { compress } from '@simon_he/browser-compress-image'

const file = /* 你的文件 */
const compressedBlob = await compress(file, 0.6) // 默认返回 Blob
```

## 返回不同类型的结果

### 返回 Blob

```typescript
const compressedBlob = await compress(file, 0.6, 'blob')
console.log(compressedBlob instanceof Blob) // true
```

### 返回 File

```typescript
const compressedFile = await compress(file, 0.6, 'file')
console.log(compressedFile instanceof File) // true
console.log(compressedFile.name) // 原始文件名
```

### 返回 Base64 字符串

```typescript
const compressedBase64 = await compress(file, 0.6, 'base64')
console.log(typeof compressedBase64) // 'string'
console.log(compressedBase64.startsWith('data:')) // true
```

### 返回 ArrayBuffer

```typescript
const compressedArrayBuffer = await compress(file, 0.6, 'arrayBuffer')
console.log(compressedArrayBuffer instanceof ArrayBuffer) // true
```

## TypeScript 类型支持

函数提供完整的 TypeScript 类型支持：

```typescript
import type { CompressResult, CompressResultType } from '@simon_he/browser-compress-image'
import { compress } from '@simon_he/browser-compress-image'

// 类型会根据第三个参数自动推断
const blob = await compress(file, 0.6, 'blob') // 类型: Blob
const file2 = await compress(file, 0.6, 'file') // 类型: File
const base64 = await compress(file, 0.6, 'base64') // 类型: string
const buffer = await compress(file, 0.6, 'arrayBuffer') // 类型: ArrayBuffer
```

## 实际应用示例

### 直接上传压缩后的文件

```typescript
const compressedFile = await compress(originalFile, 0.6, 'file')
const formData = new FormData()
formData.append('image', compressedFile)
fetch('/upload', { method: 'POST', body: formData })
```

### 显示压缩后的图片预览

```typescript
const compressedBase64 = await compress(originalFile, 0.6, 'base64')
const img = document.createElement('img')
img.src = compressedBase64
document.body.appendChild(img)
```

### 处理二进制数据

```typescript
const compressedBuffer = await compress(originalFile, 0.6, 'arrayBuffer')
// 可以进一步处理 ArrayBuffer，比如发送到 WebSocket 或进行其他二进制操作
```
