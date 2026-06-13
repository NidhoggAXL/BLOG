<script setup lang="ts">
import type { PostDeleteImpact, PostDeleteResult } from '~/types/post'

const props = defineProps<{
  modelValue: boolean
  slug: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  deleted: [PostDeleteResult]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const loading = ref(false)
const deleting = ref(false)
const impact = ref<PostDeleteImpact | null>(null)
const loadError = ref<string | null>(null)

watch(
  () => [visible.value, props.slug] as const,
  async ([open, slug]) => {
    if (!open || !slug) return
    loading.value = true
    loadError.value = null
    impact.value = null
    try {
      impact.value = await $fetch<PostDeleteImpact>(
        `/api/posts/${encodeURIComponent(slug)}/delete-impact`,
      )
    } catch (e: unknown) {
      const err = e as { data?: { statusMessage?: string }; message?: string }
      loadError.value = err?.data?.statusMessage || err?.message || '加载删除影响失败'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

async function confirmDelete() {
  if (!props.slug) return
  deleting.value = true
  try {
    const res = await $fetch<PostDeleteResult>(`/api/posts/${encodeURIComponent(props.slug)}`, {
      method: 'DELETE',
    })
    visible.value = false
    emit('deleted', res)
    let msg = `已删除「${res.title}」`
    if (res.inbound_links_affected > 0) {
      msg += `；${res.inbound_links_affected} 篇其他文章的链接将变为未解析`
    }
    ElMessage.success(msg)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    ElMessage.error(err?.data?.statusMessage || err?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="删除文章"
    width="520px"
    align-center
    destroy-on-close
    class="post-delete-dlg"
  >
    <el-skeleton v-if="loading" :rows="4" animated />
    <el-alert v-else-if="loadError" type="error" :closable="false" :title="loadError" />
    <template v-else-if="impact">
      <p class="post-delete-dlg__lead">
        确定删除 <strong>{{ impact.title }}</strong>（<code>{{ impact.slug }}</code>）？此操作不可恢复。
      </p>
      <ul class="post-delete-dlg__stats">
        <li>将移除本篇 <strong>{{ impact.outbound_links }}</strong> 条出链记录</li>
        <li>
          将影响 <strong>{{ impact.inbound_links }}</strong> 篇其他文章的反向链接（边表中标为未找到目标）
        </li>
      </ul>
      <div v-if="impact.backlinks.length" class="post-delete-dlg__backlinks">
        <p class="post-delete-dlg__backlinks-title">引用本篇的文章：</p>
        <ul class="post-delete-dlg__backlinks-list">
          <li v-for="(b, i) in impact.backlinks" :key="i">
            <span class="post-delete-dlg__backlink-title">{{ b.source_title }}</span>
            <code class="post-delete-dlg__backlink-slug">{{ b.source_slug }}</code>
            <span class="post-delete-dlg__backlink-raw">{{ b.raw_target }}</span>
          </li>
        </ul>
        <p class="post-delete-dlg__hint">
          上述文章正文中的 <code>[[...]]</code> 不会自动删除，但双链边表会更新；重新保存那些文章可完全同步。
        </p>
      </div>
    </template>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="danger" :loading="deleting" :disabled="loading || !!loadError" @click="confirmDelete">
        确认删除
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="less">
.post-delete-dlg__lead {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--admin-text);
}

.post-delete-dlg__lead code {
  font-size: 12px;
}

.post-delete-dlg__stats {
  margin: 0 0 14px;
  padding-left: 1.2rem;
  font-size: 13px;
  line-height: 1.6;
  color: var(--admin-muted);
}

.post-delete-dlg__backlinks {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  background: var(--admin-nav-hover);
  max-height: 200px;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
}

.post-delete-dlg__backlinks-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--admin-text);
}

.post-delete-dlg__backlinks-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-delete-dlg__backlinks-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--admin-border);
  font-size: 13px;
}

.post-delete-dlg__backlinks-list li:last-child {
  border-bottom: none;
}

.post-delete-dlg__backlink-title {
  font-weight: 500;
  color: var(--admin-text);
}

.post-delete-dlg__backlink-slug {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--admin-toolbar-bg);
  border: 1px solid var(--admin-border);
}

.post-delete-dlg__backlink-raw {
  font-size: 12px;
  color: var(--admin-muted);
}

.post-delete-dlg__hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--admin-muted);
}

.post-delete-dlg__hint code {
  font-size: 11px;
}
</style>
