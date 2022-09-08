<script setup lang="ts">
import { compress } from '../../src'
const originSize = ref<Number>()
const compressSize = ref<Number>()
onMounted(() => {
  document.getElementById('file')!.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    const compressFile = await compress(file)
    originSize.value = (file.size / 1024 / 1024).toFixed(2)
    compressSize.value = (compressFile.size / 1024 / 1024).toFixed(2)
  })
})
</script>

<template>
  <div>
    <input id="file" type="file" accept="image/*">
    <div v-if="compressSize">
      <div>压缩前: {{ originSize }}mb</div>
      <div>压缩后: {{ compressSize }}mb</div>
      <div>压缩了:{{ (originSize - compressSize).toFixed(2) }}mb</div>
    </div>
  </div>
</template>

<style scoped>
</style>

