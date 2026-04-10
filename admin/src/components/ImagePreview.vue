<template>
  <div class="image-preview">
    <template v-if="images && images.length">
      <el-image
        v-for="(img, index) in images"
        :key="index"
        :src="getImageUrl(img)"
        :preview-src-list="previewList"
        :initial-index="index"
        fit="cover"
        class="preview-image"
      />
    </template>
    <el-empty v-else description="暂无图片" :image-size="60" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

const previewList = computed(() => {
  return (props.images || []).map(img => getImageUrl(img))
})

function getImageUrl(img) {
  if (!img) return ''
  if (img.startsWith('http')) return img
  return img
}
</script>

<style scoped>
.image-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-image {
  width: 120px;
  height: 120px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
