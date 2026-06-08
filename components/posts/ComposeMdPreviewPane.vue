<script setup lang="ts">
import { renderPostMarkdownForView } from '~/composables/usePostMarkdownRender'

const props = withDefaults(
  defineProps<{
    markdown: string
  }>(),
  {
    markdown: '',
  },
)

const html = ref('')
const loading = ref(false)
const articleRef = ref<HTMLElement | null>(null)
const { onMarkdownContentClick } = useSpaMarkdownLinkClick()

let timer: ReturnType<typeof setTimeout> | null = null

async function renderNow() {
  const md = props.markdown ?? ''
  if (!md.trim()) {
    html.value = ''
    loading.value = false
    return
  }
  loading.value = true
  try {
    html.value = await renderPostMarkdownForView(md, { withEmbeds: true })
  } catch {
    html.value = '<p class="compose-md-preview__error">预览渲染失败</p>'
  } finally {
    loading.value = false
  }
}

function scheduleRender() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void renderNow(), 280)
}

watch(() => props.markdown, scheduleRender, { immediate: true })

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

function scrollToAnchor(anchor: string) {
  const article = articleRef.value
  if (!article || !anchor) return
  const el = article.querySelector(`#${CSS.escape(anchor)}`) as HTMLElement | null
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

defineExpose({ reload: renderNow, scrollToAnchor })
</script>

<template>
  <div class="compose-md-preview">
    <p v-if="loading && !html" class="compose-md-preview__loading">渲染中…</p>
    <article
      v-if="html"
      ref="articleRef"
      class="post-read markdown-body compose-md-preview__article"
      v-html="html"
      @click="onMarkdownContentClick"
    />
    <p v-else-if="!loading && !markdown?.trim()" class="compose-md-preview__empty">
      右侧将显示渲染效果
    </p>
  </div>
</template>

<style scoped lang="less">
.compose-md-preview {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  overflow: visible;
}

.compose-md-preview__loading,
.compose-md-preview__empty {
  margin: 0;
  padding: 24px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--admin-muted);
}

.compose-md-preview__article {
  padding: 0;
}

.compose-md-preview :deep(.compose-md-preview__error) {
  margin: 0;
  color: var(--el-color-warning);
}
</style>
