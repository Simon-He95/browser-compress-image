<script setup lang="ts">
import { gitFork } from '@simon_he/git-fork'
import { toBase64 } from 'simon-js-tool'
import { Upload } from '@element-plus/icons-vue'
import { compress } from '../../src'
// import { compress } from '@simon_he/browser-compress-image'
const originSize = ref<String>()
const compressSize = ref<String>()
const oldbase = ref<string>()
const newbase = ref<string>()
const quality = ref(60)
const file = ref<File>(null)

const marks = reactive({
  10: '10%',
  20: '20%',
  30: '30%',
  40: '40%',
  50: '50%',
  60: '60%',
  70: '70%',
  80: '80%',
  90: '90%',
  100: '100%',
})

const compressImage = async () => {
  if (!file.value)
    return
  const compressFile = await compress(file.value, quality.value / 100)
  originSize.value = (file.value.size / 1024 / 1024).toFixed(2)
  compressSize.value = (compressFile.size / 1024 / 1024).toFixed(2)
  oldbase.value = URL.createObjectURL(file.value)
  newbase.value = URL.createObjectURL(compressFile)
}
onMounted(() => {
  document.getElementById('file')!.addEventListener('change', async (e) => {
    file.value = e.target.files[0]
    compressImage()
  })
})

const changeHandler = (val) => {
  quality.value = val
  compressImage()
}
const rate = computed(() => {
  return (
    ((originSize.value - compressSize.value) / originSize.value || 0) * 100
  ).toFixed(2)
})
const upload = () => {
  document.getElementById('file')?.click()
}
</script>

<template>
  <div font-sans>
    <!-- <div fixed top-0 right-0 border-0 z-10></div> -->
    <git-fork
      link="https://github.com/Simon-He95/browser-compress-image"
      position="right"
    />
    <vivid-typing
      content="browser-compress-image"
      text-3xl
      font-bold
      text-center
      mb-10
      bg-gray
      lh-30
      ma
      color-white
    />

    <div w-100 ma>
      <div flex="~ gap-4" items-center lh-10>
        <el-button size="large" @click="upload">
          Upload<el-icon class="el-icon--right">
            <Upload />
          </el-icon>
        </el-button>
        <div>quality: {{ quality }}%</div>
      </div>
      <el-slider
        v-model="quality"
        py-8
        :max="100"
        :step="1"
        :marks="marks"
        @change="changeHandler"
      />
    </div>
    <input id="file" type="file" accept="image/*" hidden>
    <div pt7 px4>
      <div v-show="file">
        <span mr3 font-bold>name:</span>{{ file?.name }}
      </div>
      <div v-if="compressSize" flex="~ gap-20">
        <div>
          <span font-bold mr3>Before compression:</span>
          <span color-green font-800>{{ originSize }}mb</span>
        </div>
        <div>
          <span font-bold mr3>After compression:</span>
          <span color-green font-800>{{ compressSize }}mb</span>
        </div>
        <div>
          <span font-bold mr3>Compressed:</span>
          <span color-green font-800>{{ (originSize - compressSize).toFixed(2) }}mb</span>
        </div>
        <div>
          <span font-bold mr3>Compression percentage:</span>
          <span :class="[rate > 50 ? 'color-green' : 'color-red']" font-800>
            {{ rate }}%
          </span>
        </div>
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
      >
      <img
        :src="newbase"
        alt="压缩后的图片"
        border-1
        border-gray
        border-rd-1
        p5
        ma
      >
    </div>
  </div>
</template>

<style scoped>
</style>

