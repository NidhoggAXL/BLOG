<script setup lang="ts">
import type { ImportBatchResult } from '~/types/import'

definePageMeta({
  layout: 'admin',
})

useHead({ title: '批量导入' })

const router = useRouter()
const { peekBatchImport, clearBatchImportStash } = usePostBatchImportStash()

const stash = ref<ReturnType<typeof peekBatchImport>>(null)
const stashReady = ref(false)

onMounted(() => {
  stash.value = peekBatchImport()
  stashReady.value = true
  if (!stash.value) {
    ElMessage.warning('未找到待导入的压缩包，请重新选择 .zip 文件')
    void router.replace('/admin/posts')
  }
})

function onCancel() {
  clearBatchImportStash()
  void router.push('/admin/posts')
}

async function onDone(_res: ImportBatchResult) {
  clearBatchImportStash()
  await router.push('/admin/posts/directories')
}
</script>

<template>
  <div class="post-import-batch-page">
    <el-skeleton v-if="!stashReady" :rows="6" animated />

    <PostsPostImportBatchPanel
      v-else-if="stash"
      :files="stash.files"
      :source-name="stash.sourceName"
      @cancel="onCancel"
      @done="onDone"
    />
  </div>
</template>

<style scoped lang="less">
.post-import-batch-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
}
</style>
