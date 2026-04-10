<template>
  <div class="image-uploader">
    <el-upload
      :file-list="fileList"
      :action="uploadAction"
      :headers="headers"
      :limit="limit"
      :on-success="handleSuccess"
      :on-remove="handleRemove"
      :on-exceed="handleExceed"
      :before-upload="beforeUpload"
      list-type="picture-card"
      accept="image/*"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>
    <el-dialog v-model="previewVisible" title="图片预览">
      <img :src="previewUrl" style="width: 100%" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  limit: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits(['update:modelValue'])

const uploadAction = '/api/upload'
const headers = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const previewVisible = ref(false)
const previewUrl = ref('')

const fileList = ref([])

// 初始化 fileList
watch(
  () => props.modelValue,
  (val) => {
    if (val && val.length) {
      fileList.value = val.map((url, index) => ({
        name: `image_${index}`,
        url: url.startsWith('http') ? url : url
      }))
    } else {
      fileList.value = []
    }
  },
  { immediate: true }
)

function beforeUpload(file) {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过10MB')
    return false
  }
  return true
}

function handleSuccess(response, file) {
  if (response.data) {
    const urls = [...props.modelValue, response.data.url]
    emit('update:modelValue', urls)
  }
}

function handleRemove(file) {
  const url = file.url || file.response?.data?.url
  const urls = props.modelValue.filter(u => u !== url)
  emit('update:modelValue', urls)
}

function handleExceed() {
  ElMessage.warning(`最多只能上传${props.limit}张图片`)
}

function handlePreview(file) {
  previewUrl.value = file.url
  previewVisible.value = true
}
</script>

<style scoped>
.image-uploader {
  :deep(.el-upload--picture-card) {
    width: 100px;
    height: 100px;
  }

  :deep(.el-upload-list--picture-card .el-upload-list__item) {
    width: 100px;
    height: 100px;
  }
}
</style>
