<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import { fetchErrorMessage } from '~/utils/fetchErrorMessage'

const rebuilding = ref(false)

async function onRebuild() {
  try {
    await ElMessageBox.confirm(
      '将按当前正文为全库文章重建 post_wikilinks 出链边表。歧义边将保留为 ambiguous 状态。是否继续？',
      '重建双链边表',
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
    const res = await $fetch<{ posts_rebuilt: number; edges_written: number }>(
      '/api/wikilinks/rebuild',
      { method: 'POST', body: { all: true } },
    )
    ElMessage.success(
      `重建完成：${res.posts_rebuilt} 篇文章，写入 ${res.edges_written} 条出链`,
    )
  } catch (e: unknown) {
    ElMessage.error(fetchErrorMessage(e, '重建失败'))
  } finally {
    rebuilding.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="wikilink-rebuild-btn"
    :disabled="rebuilding"
    @click="onRebuild"
  >
    <el-icon
      class="wikilink-rebuild-btn__icon"
      :class="{ 'wikilink-rebuild-btn__icon--spin': rebuilding }"
      :size="16"
    >
      <Refresh />
    </el-icon>
    <span>{{ rebuilding ? '重建中…' : '全库重建双链' }}</span>
  </button>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.wikilink-rebuild-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: @radius-md;
  border: 1px solid color-mix(in srgb, var(--accent) 38%, var(--admin-border));
  font-size: 13px;
  font-weight: 550;
  line-height: 1.35;
  color: var(--btn-primary-fg);
  background: var(--btn-primary-bg);
  box-shadow: 0 2px 8px var(--btn-primary-shadow);
  cursor: pointer;
  transition:
    filter @transition-fast,
    box-shadow @transition-fast,
    transform @transition-fast;

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    box-shadow: 0 3px 10px var(--btn-primary-shadow);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.72;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    outline-offset: 2px;
  }
}

.wikilink-rebuild-btn__icon {
  flex-shrink: 0;
}

.wikilink-rebuild-btn__icon--spin {
  animation: wikilink-rebuild-spin 0.9s linear infinite;
}

@keyframes wikilink-rebuild-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
