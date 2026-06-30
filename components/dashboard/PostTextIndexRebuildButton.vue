<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import { fetchErrorMessage } from '~/utils/fetchErrorMessage'

const rebuilding = ref(false)

async function onRebuild() {
  try {
    await ElMessageBox.confirm(
      '将为全库已发布文章重建文本检索索引：正文去 Markdown 语法后分块，并向量化写入 post_embeddings。需 Ollama 与 embedding 模型就绪。是否继续？',
      '全库文本分块',
      {
        type: 'warning',
        confirmButtonText: '开始重建',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  rebuilding.value = true
  try {
    const res = await $fetch<{
      posts_indexed: number
      chunks_written: number
      failed: number
    }>('/api/ai/embed/rebuild', { method: 'POST', body: { all: true } })
    const failedPart = res.failed ? `，失败 ${res.failed} 篇` : ''
    ElMessage.success(
      `重建完成：${res.posts_indexed} 篇文章，${res.chunks_written} 个文本块${failedPart}`,
    )
  } catch (e: unknown) {
    ElMessage.error(fetchErrorMessage(e, '文本分块失败'))
  } finally {
    rebuilding.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="admin-rebuild-btn"
    :disabled="rebuilding"
    @click="onRebuild"
  >
    <el-icon
      class="admin-rebuild-btn__icon"
      :class="{ 'admin-rebuild-btn__icon--spin': rebuilding }"
      :size="16"
    >
      <Refresh />
    </el-icon>
    <span>{{ rebuilding ? '分块中…' : '全库文本分块' }}</span>
  </button>
</template>

<style scoped lang="less">
@import '~/assets/styles/admin-rebuild-btn.less';
</style>
