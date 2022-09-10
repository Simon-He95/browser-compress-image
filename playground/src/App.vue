<script setup lang="ts">
import { toBase64 } from "simon-js-tool";
import { compress } from "../../src";
// import { compress } from '@simon_he/browser-compress-image'
const originSize = ref<String>();
const compressSize = ref<String>();
const oldbase = ref<string>();
const newbase = ref<string>();
onMounted(() => {
  document.getElementById("file")!.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    const compressFile = await compress(file);
    originSize.value = (file.size / 1024 / 1024).toFixed(2);
    compressSize.value = (compressFile.size / 1024 / 1024).toFixed(2);
    oldbase.value = await toBase64(file, "file");
    newbase.value = await toBase64(compressFile, "file");
  });
});
</script>

<template>
  <div p-4>
    <input id="file" type="file" accept="image/*" />
    <div v-if="compressSize">
      <div>压缩前: {{ originSize }}mb</div>
      <div>压缩后: {{ compressSize }}mb</div>
      <div>压缩了: {{ (originSize - compressSize).toFixed(2) }}mb</div>
      <div>
        压缩率:
        {{
          (((originSize - compressSize) / originSize || 0) * 100).toFixed(2)
        }}%
      </div>
    </div>

    <div v-if="newbase" grid grid-cols-2 gap-10 py-2>
      <img
        :src="oldbase"
        alt="压缩前的图片"
        border-1
        border-gray
        border-rd-1
        p5
        ma
      />
      <img
        :src="newbase"
        alt="压缩后的图片"
        border-1
        border-gray
        border-rd-1
        p5
        ma
      />
    </div>
  </div>
  <Footer />
</template>

<style scoped>
</style>

