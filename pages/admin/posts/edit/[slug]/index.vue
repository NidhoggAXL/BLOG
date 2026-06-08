<script setup lang="ts">
import { ArrowLeft, DocumentChecked } from '@element-plus/icons-vue'

const PostImmersiveMdEditor = defineAsyncComponent(
  () => import('~/components/posts/PostImmersiveMdEditor.vue'),
)

const route = useRoute()
const router = useRouter()
const slug = computed(() => String(route.params.slug ?? ''))

const { treeSelectData, linkOptions, loading: loadingMeta, loadMeta } = usePostCreateMeta()

const loadingPost = ref(true)
const loadError = ref<string | null>(null)
const originalSlug = ref('')
const { stashEditSave } = usePostEditSaveStash()

const body = ref('')
const metaSnapshot = ref({
  title: '',
  slug: '',
  directory_id: 0 as number,
  status: 'draft' as 'draft' | 'published' | 'archived',
  wikilink_slugs: [] as string[],
})

const pageTitle = computed(() =>
  metaSnapshot.value.title ? `编辑 · ${metaSnapshot.value.title}` : '编辑文章',
)

const excludeSlugs = computed(() =>
  [originalSlug.value, metaSnapshot.value.slug].filter(Boolean),
)

const dirty = ref(false)

const postCache = usePostCacheStore()

async function loadPost(force = false) {
  loadingPost.value = true
  loadError.value = null
  try {
    const post = await postCache.fetchDetail(slug.value, { force })
    originalSlug.value = post.slug
    body.value = post.body
    metaSnapshot.value = {
      title: post.title,
      slug: post.slug,
      directory_id: post.directory_id ?? 0,
      status: post.status,
      wikilink_slugs: [...(post.wikilink_target_slugs ?? [])],
    }
    dirty.value = false
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    loadError.value = err?.data?.statusMessage || err?.message || '加载文章失败'
  } finally {
    loadingPost.value = false
  }
}

onMounted(async () => {
  await loadMeta().catch(() => {})
  await loadPost()
})

watch(body, () => {
  if (!loadingPost.value) dirty.value = true
})

function onBack() {
  if (dirty.value) {
    ElMessageBox.confirm('正文或设置尚未保存，确定离开？', '离开编辑', {
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑',
      type: 'warning',
    })
      .then(() => router.push(`/admin/posts/${encodeURIComponent(originalSlug.value || slug.value)}`))
      .catch(() => {})
    return
  }
  router.push(`/admin/posts/${encodeURIComponent(originalSlug.value || slug.value)}`)
}

async function goToSavePage() {
  const editSlug = originalSlug.value || slug.value
  if (!editSlug) {
    ElMessage.warning('文章标识无效，请刷新后重试')
    return
  }
  stashEditSave({
    originalSlug: editSlug,
    body: body.value,
    title: metaSnapshot.value.title,
    directory_id: metaSnapshot.value.directory_id,
    status: metaSnapshot.value.status,
    wikilink_slugs: [...metaSnapshot.value.wikilink_slugs],
  })
  await router.push(`/admin/posts/edit/${encodeURIComponent(editSlug)}/save`)
}

useHead(() => ({ title: pageTitle.value }))

if (import.meta.client) {
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!dirty.value) return
    e.preventDefault()
    e.returnValue = ''
  }
  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
</script>

<template>
  <div class="post-compose">
    <header class="post-compose__bar">
      <div class="post-compose__bar-start">
        <el-button :icon="ArrowLeft" text @click="onBack">返回</el-button>
      </div>
      <h1 class="post-compose__bar-center">{{ pageTitle }}</h1>
      <div class="post-compose__bar-end post-compose__actions">
        <ThemeToggle />
        <el-button
          type="primary"
          :icon="DocumentChecked"
          :loading="loadingMeta || loadingPost"
          :disabled="Boolean(loadError)"
          @click="goToSavePage"
        >
          保存
        </el-button>
      </div>
    </header>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      :title="loadError"
      class="post-compose__alert"
    />

    <el-skeleton v-else-if="loadingPost" class="post-compose__skeleton" :rows="4" animated />

    <main v-else class="post-compose-page__main">
      <div class="post-compose-page__stage">
        <PostImmersiveMdEditor
          v-model="body"
          :link-options="linkOptions"
          :exclude-slugs="excludeSlugs"
        />
      </div>
    </main>
  </div>
</template>

<style scoped lang="less">
.post-compose {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.post-compose__alert {
  margin: 0 0 12px;
}

.post-compose__skeleton {
  padding: 24px;
}
</style>
