<script setup lang="ts">
import type { PostBatchDeleteImpact, PostBatchDeleteResult } from '~/types/post'

export type BatchDeleteRequest =
  | { mode: 'selection'; slugs: string[] }
  | { mode: 'directory'; directory_id: number; directory_label: string }

const props = defineProps<{
  modelValue: boolean
  request: BatchDeleteRequest | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  deleted: [PostBatchDeleteResult]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const loading = ref(false)
const deleting = ref(false)
const impact = ref<PostBatchDeleteImpact | null>(null)
const loadError = ref<string | null>(null)

const titleText = computed(() => {
  if (!props.request) return '批量删除'
  if (props.request.mode === 'directory') {
    return `删除目录内全部文章`
  }
  return `删除选中的文章`
})

async function loadImpact() {
  if (!props.request) return
  loading.value = true
  loadError.value = null
  impact.value = null
  try {
    const body =
      props.request.mode === 'directory'
        ? {
            directory_id: props.request.directory_id,
            directory_label: props.request.directory_label,
          }
        : { slugs: props.request.slugs }
    impact.value = await $fetch<PostBatchDeleteImpact>('/api/posts/batch-delete-impact', {
      method: 'POST',
      body,
    })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    loadError.value = err?.data?.statusMessage || err?.message || '加载删除影响失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => [visible.value, props.request] as const,
  ([open, req]) => {
    if (open && req) void loadImpact()
  },
  { immediate: true },
)

async function confirmDelete() {
  if (!props.request || !impact.value?.total_posts) return
  deleting.value = true
  try {
    const body =
      props.request.mode === 'directory'
        ? { directory_id: props.request.directory_id }
        : { slugs: props.request.slugs }
    const res = await $fetch<PostBatchDeleteResult>('/api/posts/batch-delete', {
      method: 'POST',
      body,
    })
    visible.value = false
    emit('deleted', res)
    let msg = `已删除 ${res.deleted_count} 篇文章`
    if (res.total_inbound_marked_missing > 0) {
      msg += `；${res.total_inbound_marked_missing} 条入链已标为未解析`
    }
    ElMessage.success(msg)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    ElMessage.error(err?.data?.statusMessage || err?.message || '批量删除失败')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="titleText"
    width="520px"
    align-center
    destroy-on-close
    class="post-batch-delete-dlg"
  >
    <el-skeleton v-if="loading" :rows="5" animated />
    <el-alert v-else-if="loadError" type="error" :closable="false" :title="loadError" />
    <template v-else-if="impact">
      <p v-if="impact.mode === 'directory'" class="post-batch-delete-dlg__lead">
        确定删除目录 <strong>{{ impact.directory_label }}</strong> 下的全部
        <strong>{{ impact.total_posts }}</strong> 篇文章？此操作不可恢复。
      </p>
      <p v-else class="post-batch-delete-dlg__lead">
        确定删除选中的 <strong>{{ impact.total_posts }}</strong> 篇文章？此操作不可恢复。
      </p>

      <ul v-if="impact.total_posts > 0" class="post-batch-delete-dlg__stats">
        <li>将移除合计 <strong>{{ impact.total_outbound }}</strong> 条出链记录</li>
        <li>
          将影响 <strong>{{ impact.total_inbound }}</strong> 条其他文章的反向链接（标为未找到目标）
        </li>
      </ul>

      <el-alert
        v-else
        type="info"
        :closable="false"
        show-icon
        title="没有可删除的文章"
      />

      <div v-if="impact.posts.length" class="post-batch-delete-dlg__list-wrap">
        <p class="post-batch-delete-dlg__list-title">将删除的文章：</p>
        <ul class="post-batch-delete-dlg__list">
          <li v-for="p in impact.posts" :key="p.slug">
            <span class="post-batch-delete-dlg__post-title">{{ p.title }}</span>
            <code>{{ p.slug }}</code>
          </li>
        </ul>
      </div>

      <div v-if="impact.backlinks.length" class="post-batch-delete-dlg__backlinks">
        <p class="post-batch-delete-dlg__backlinks-title">引用将被影响的其他文章（节选）：</p>
        <ul class="post-batch-delete-dlg__backlinks-list">
          <li v-for="(b, i) in impact.backlinks.slice(0, 8)" :key="i">
            <span>{{ b.source_title }}</span>
            <code>{{ b.source_slug }}</code>
          </li>
        </ul>
        <p v-if="impact.backlinks.length > 8" class="post-batch-delete-dlg__more">
          另有 {{ impact.backlinks.length - 8 }} 篇…
        </p>
      </div>
    </template>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="danger"
        :loading="deleting"
        :disabled="loading || !!loadError || !impact?.total_posts"
        @click="confirmDelete"
      >
        确认删除
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="less">
.post-batch-delete-dlg__lead {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--admin-text);
}

.post-batch-delete-dlg__stats {
  margin: 0 0 14px;
  padding-left: 1.2rem;
  font-size: 13px;
  line-height: 1.6;
  color: var(--admin-muted);
}

.post-batch-delete-dlg__list-wrap {
  margin-bottom: 12px;
  max-height: 160px;
  overflow: auto;
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  padding: 10px 12px;
}

.post-batch-delete-dlg__list-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}

.post-batch-delete-dlg__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-batch-delete-dlg__list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--admin-border);
}

.post-batch-delete-dlg__list li:last-child {
  border-bottom: none;
}

.post-batch-delete-dlg__post-title {
  font-weight: 500;
}

.post-batch-delete-dlg__list code {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--admin-nav-hover);
}

.post-batch-delete-dlg__backlinks {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--admin-nav-hover);
  font-size: 13px;
}

.post-batch-delete-dlg__backlinks-title {
  margin: 0 0 6px;
  font-weight: 600;
}

.post-batch-delete-dlg__backlinks-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-batch-delete-dlg__backlinks-list li {
  padding: 3px 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.post-batch-delete-dlg__more {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--admin-muted);
}
</style>
