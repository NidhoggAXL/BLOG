<script setup lang="ts">
import { ArrowLeft, Check, EditPen } from '@element-plus/icons-vue'
import type { PostUpdateResult } from '~/types/post'
import type PostSaveMetaForm from '~/components/posts/PostSaveMetaForm.vue'

const route = useRoute()
const router = useRouter()
const slugParam = computed(() => String(route.params.slug ?? ''))

const { consumeEditSave, clearEditSaveStash, stashEditSave } = usePostEditSaveStash()
const { treeSelectData, linkOptions, loading: loadingMeta, loadMeta } = usePostCreateMeta()
const postCache = usePostCacheStore()

const stash = ref<ReturnType<typeof consumeEditSave>>(null)
const stashReady = ref(false)
const submitting = ref(false)
const metaFormRef = ref<InstanceType<typeof PostSaveMetaForm> | null>(null)
const bodyMarkdown = ref('')

const originalSlug = computed(() => stash.value?.originalSlug ?? slugParam.value)

const excludeSlugs = computed(() => [originalSlug.value].filter(Boolean))

const pageTitle = computed(() =>
  stash.value?.title ? `保存 · ${stash.value.title}` : '保存文章',
)

function normalizeSlug(s: string) {
  try {
    return decodeURIComponent(s).trim()
  } catch {
    return s.trim()
  }
}

onMounted(async () => {
  stash.value = consumeEditSave()
  stashReady.value = true
  if (
    !stash.value ||
    normalizeSlug(stash.value.originalSlug) !== normalizeSlug(slugParam.value)
  ) {
    ElMessage.warning('未找到待保存的编辑内容，请返回编辑页重试')
    await router.replace(`/admin/posts/edit/${encodeURIComponent(slugParam.value)}`)
    return
  }
  bodyMarkdown.value = stash.value.body
  await loadMeta().catch(() => {})
})

function onBackToEdit() {
  const payload = metaFormRef.value?.buildPayload()
  if (stash.value) {
    const wikilinkSlugs = payload?.wikilink_slugs ?? stash.value.wikilink_slugs
    stashEditSave({
      originalSlug: originalSlug.value,
      body: bodyMarkdown.value,
      title: payload?.title ?? stash.value.title,
      directory_id: payload?.directory_id ?? stash.value.directory_id,
      status: payload?.status ?? stash.value.status,
      wikilink_slugs: wikilinkSlugs,
    })
  }
  router.push(`/admin/posts/edit/${encodeURIComponent(originalSlug.value)}`)
}

function onRecommendComplete(payload: { adoptedSlugs: string[] }) {
  if (payload.adoptedSlugs.length) {
    metaFormRef.value?.mergeWikilinkSlugs(payload.adoptedSlugs)
  }
}

async function onSave() {
  const payload = metaFormRef.value?.buildPayload()
  if (!payload || !stash.value) return

  submitting.value = true
  try {
    const res = await $fetch<PostUpdateResult>(
      `/api/posts/${encodeURIComponent(originalSlug.value)}`,
      {
        method: 'PUT',
        body: {
          title: payload.title,
          directory_id: payload.directory_id === 0 ? null : payload.directory_id,
          status: payload.status,
          body: bodyMarkdown.value,
          wikilink_target_slugs: payload.wikilink_slugs,
        },
      },
    )
    const savedSlug = res.slug ?? originalSlug.value
    const previousSlug = originalSlug.value

    postCache.setDetail(res)
    if (res.slug_changed && previousSlug && previousSlug !== savedSlug) {
      postCache.removeDetail(previousSlug)
      clearNuxtData(`admin-post-detail:${previousSlug}`)
    }
    clearNuxtData(`admin-post-detail:${savedSlug}`)
    invalidatePostMarkdownRenderCache()
    clearEditSaveStash()
    ElMessage.success('文章已保存')
    if (res.warnings?.length) {
      for (const w of res.warnings) {
        ElMessage.warning(w)
      }
    }
    await navigateTo(`/admin/posts/${encodeURIComponent(savedSlug)}`)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    ElMessage.error(err?.data?.statusMessage || err?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

useHead(() => ({ title: pageTitle.value }))
</script>

<template>
  <div class="post-compose post-save-page">
    <header class="post-compose__bar">
      <div class="post-compose__bar-start">
        <el-button :icon="ArrowLeft" text :disabled="!stash" @click="onBackToEdit">
          返回编辑
        </el-button>
      </div>
      <h1 class="post-compose__bar-center">{{ pageTitle }}</h1>
      <div class="post-compose__bar-end post-compose__actions">
        <ThemeToggle />
        <el-button :icon="EditPen" :disabled="!stash || submitting" @click="onBackToEdit">
          继续编辑
        </el-button>
        <el-button
          type="primary"
          :icon="Check"
          :loading="submitting || loadingMeta"
          :disabled="!stash || !stashReady"
          @click="onSave"
        >
          保存文章
        </el-button>
      </div>
    </header>

    <el-skeleton v-if="!stashReady" class="post-save-page__skeleton" :rows="6" animated />

    <main v-else-if="stash" class="post-compose-page__main post-save-page__main">
      <div class="post-save-page__workspace">
        <section class="post-save-page__primary compose-panel-card">
          <header class="compose-panel-card__head">
            <h2 class="compose-panel-card__title">文章设置</h2>
          </header>
          <div class="compose-panel-card__content">
            <p class="post-save-page__lead">
              修改标题、目录、状态或双链；正文已在编辑区写好，将随本次保存一并提交。
            </p>
            <PostsPostSaveMetaForm
              ref="metaFormRef"
              :tree-select-data="treeSelectData"
              :link-options="linkOptions"
              :markdown-body="bodyMarkdown"
              :initial-title="stash.title"
              :initial-directory-id="stash.directory_id"
              :initial-status="stash.status"
              :initial-wikilink-slugs="stash.wikilink_slugs"
            />
          </div>
        </section>

        <aside class="post-save-page__aside">
          <PostsPostAiLinkRecommendPanel
            :markdown-body="bodyMarkdown"
            :title="stash.title"
            :link-options="linkOptions"
            :exclude-slugs="excludeSlugs"
            :existing-slugs="stash.wikilink_slugs"
            @complete="onRecommendComplete"
          />
        </aside>
      </div>
    </main>
  </div>
</template>

<style scoped lang="less">
.post-compose.post-save-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.post-save-page__skeleton {
  padding: 24px;
  flex: 1;
}

.post-save-page__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: var(--post-compose-panel-gap, 12px);
}

/* height:0 + flex:1 让工作区在 column 布局里拿到确定高度 */
.post-save-page__workspace {
  flex: 1 1 0;
  min-height: 0;
  height: 0;
  display: flex;
  align-items: stretch;
  gap: var(--post-compose-panel-gap, 12px);
  overflow: hidden;
}

.post-save-page__primary {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.post-save-page__aside {
  flex: 0 0 clamp(260px, 28vw, 340px);
  min-height: 0;
  height: 100%;
}

.post-save-page__primary :deep(.compose-panel-card__content) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
}

.post-save-page__aside :deep(.post-ai-recommend) {
  height: 100%;
}

.post-save-page__lead {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--admin-muted);
}

@media (max-width: 900px) {
  .post-save-page__workspace {
    flex-direction: column;
    overflow-y: auto;
  }

  .post-save-page__primary {
    flex: 1 1 auto;
    min-height: 280px;
  }

  .post-save-page__aside {
    flex: 0 0 auto;
    min-height: 220px;
    max-height: 320px;
  }
}
</style>
