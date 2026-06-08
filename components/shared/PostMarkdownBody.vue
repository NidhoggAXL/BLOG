<script setup lang="ts">
import { renderPostMarkdownForView } from '~/composables/usePostMarkdownRender'

const props = withDefaults(
  defineProps<{
    markdown: string
    /** 服务端预渲染 HTML，用于首屏与客户端渲染失败时回退 */
    initialHtml?: string
    withEmbeds?: boolean
    articleClass?: string
    /** wikilink SPA 导航前缀，默认后台 */
    linkPathPrefix?: string
  }>(),
  {
    initialHtml: '',
    withEmbeds: true,
    articleClass: 'post-read markdown-body',
    linkPathPrefix: '/admin/posts/',
  },
)

const html = ref(props.initialHtml?.trim() ?? '')
const loading = ref(false)
const error = ref<string | null>(null)
const mounted = ref(false)

const { onMarkdownContentClick } = useSpaMarkdownLinkClick(
  () => props.linkPathPrefix,
)

function applyInitialHtml() {
  const seed = props.initialHtml?.trim()
  if (seed) html.value = seed
}

async function render() {
  if (!import.meta.client) return

  const md = props.markdown ?? ''
  if (!md.trim()) {
    applyInitialHtml()
    error.value = null
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  try {
    const next = await renderPostMarkdownForView(md, { withEmbeds: props.withEmbeds })
    if (next.trim()) {
      html.value = next
    } else if (props.initialHtml?.trim()) {
      html.value = props.initialHtml
    } else {
      html.value = ''
      error.value = '正文渲染结果为空'
    }
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message || '正文渲染失败'
    if (props.initialHtml?.trim()) {
      html.value = props.initialHtml
    } else {
      html.value = ''
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => props.initialHtml,
  () => {
    if (props.initialHtml?.trim() && !html.value) applyInitialHtml()
  },
  { immediate: true },
)

watch(
  () => [props.markdown, props.initialHtml, props.withEmbeds] as const,
  () => {
    if (!import.meta.client || !mounted.value) return
    if (props.initialHtml?.trim()) return
    void render()
  },
)

onMounted(() => {
  mounted.value = true
  applyInitialHtml()
  if (!props.initialHtml?.trim()) void render()
})

defineExpose({ reload: render })
</script>

<template>
  <div class="post-markdown-body">
    <p v-if="loading && !html" class="post-markdown-body__loading">渲染中…</p>
    <el-alert
      v-if="error && !html"
      type="warning"
      :closable="false"
      :title="error"
      class="post-markdown-body__alert"
    />
    <article
      v-if="html"
      :class="articleClass"
      v-html="html"
      @click="onMarkdownContentClick"
    />
    <p v-else-if="!loading && !markdown?.trim()" class="post-markdown-body__empty">（暂无正文）</p>
    <pre v-else-if="!loading && markdown?.trim()" class="post-markdown-body__fallback">{{ markdown }}</pre>
  </div>
</template>

<style scoped lang="less">
.post-markdown-body {
  min-height: 1px;
}

.post-markdown-body__loading,
.post-markdown-body__empty {
  margin: 0;
  padding: 24px 0;
  text-align: center;
  color: var(--admin-muted, var(--muted));
  font-size: 15px;
}

.post-markdown-body__alert {
  margin-bottom: 12px;
}

.post-markdown-body__fallback {
  max-width: 920px;
  margin: 0 auto;
  padding: 16px 40px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--admin-text, var(--text));
  background: var(--admin-nav-hover, var(--bg-hover));
  border-radius: 8px;
  box-sizing: border-box;
}
</style>
