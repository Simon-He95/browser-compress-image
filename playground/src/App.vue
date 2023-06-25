<script setup lang="ts">
import { gitFork } from '@simon_he/git-fork'
import { download } from 'lazy-js-utils'
import { ElMessage } from 'element-plus'
import { CloseBold, Download, Loading, Upload } from '@element-plus/icons-vue'
import { compress } from '../../src'
const originSize = ref<String>()
const compressSize = ref<String>()
const oldbase = ref<string>()
const newbase = ref<string>()
const quality = ref(60)
const file = ref<File>()
const loading = ref(false)
const fileRef = ref()

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
const oldSrcList = ref<string[]>([])
const newSrcList = ref<string[]>([])
const supportType = ['image/png', 'image/jpg', 'image/jpeg']

const deleteHandler = () => {
  newbase.value = ''
  oldbase.value = ''
  file.value = undefined
  compressSize.value = ''
}

const compressImage = async () => {
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
  const compressFile = await compress(file.value, quality.value / 100)
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
}
onMounted(() => {
  fileRef.value!.addEventListener('change', update)
})

async function update() {
  file.value = fileRef.value.files[0]
  loading.value = true
  await compressImage()

  loading.value = false
}
const changeHandler = (val: number) => {
  quality.value = val
  update()
}
const rate = computed(() => {
  return (
    ((+originSize.value! - +compressSize.value!) / +originSize.value! || 0) * 100
  ).toFixed(2)
})
const upload = () => {
  document.getElementById('file')?.click()
}
const down = () => {
  download(newbase.value!, file.value!.name)
}
</script>

<template>
  <div font-sans overflow-hidden>
    <div v-show="loading" class="loading">
      <el-icon class="is-loading" size="28px">
        <Loading />
      </el-icon>
    </div>
    <git-fork link="https://github.com/Simon-He95/browser-compress-image" position="right" />
    <vivid-typing content="Browser Compress Image" text-3xl font-bold text-center mb-10 bg-gray lh-30 ma color-white />
    <div w-100 ma>
      <div flex="~ gap-4" items-center lh-10 justify-center>
        <el-button v-if="!newbase" size="large" @click="upload">
          Upload<el-icon class="el-icon--right">
            <Upload />
          </el-icon>
        </el-button>
        <el-button v-else type="primary" @click="down">
          Download<el-icon class="el-icon--right">
            <Download />
          </el-icon>
        </el-button>
        <div>quality: {{ quality }}%</div>
      </div>
      <el-slider v-model="quality" py-8 :max="100" :step="1" :marks="marks" @change="changeHandler" />
    </div>
    <input id="file" ref="fileRef" type="file" accept="image/*" hidden>
    <div pt7 px4>
      <div v-show="file" flex="~ gap3" items-center>
        <span mr3 font-bold>Name:</span>{{ file?.name }} <el-icon color="red" cursor-pointer @click="deleteHandler">
          <CloseBold />
        </el-icon>
      </div>
      <div v-if="compressSize" flex="~ gap-10 wrap">
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
          <span color-green font-800>{{ (+originSize! - +compressSize).toFixed(2) }}mb</span>
        </div>
        <div>
          <span font-bold mr3>Compression percentage:</span>
          <span :class="[+rate > 50 ? 'color-green' : 'color-red']" font-800> {{ rate }}% </span>
        </div>
      </div>
    </div>
    <div v-if="newbase" grid grid-cols-2 gap-10 p-2>
      <el-image :src="oldbase" border-1 border-gray border-rd-1 p5 ma :preview-src-list="oldSrcList" />
      <el-image :src="newbase" border-1 border-gray border-rd-1 p5 ma :preview-src-list="newSrcList" />
    </div>
  </div>
</template>

<style scoped>
.loading {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}
</style>
