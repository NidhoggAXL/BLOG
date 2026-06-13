<script setup lang="ts">
import { ArrowLeft, DocumentChecked } from '@element-plus/icons-vue'
import { buildManualPostPathSlug } from '~/utils/postPathSlug'

const PostImmersiveMdEditor = defineAsyncComponent(
  () => import('~/components/posts/PostImmersiveMdEditor.vue'),
)

definePageMeta({
  layout: 'post-compose',
})

const router = useRouter()
const {
  readDraftBody,
  writeDraftBody,
  consumeImport,
  stashCreateSave,
  stashImport,
  peekCreateSave,
} = usePostComposeDraft()
const { treeSelectData, linkOptions, loading: loadingMeta, loadMeta } = usePostCreateMeta()

const body = ref('')
const submitting = ref(false)

const importMeta = ref<ReturnType<typeof consumeImport>>(null)

const hasUnsavedBody = computed(() => body.value.trim().length > 0)

let draftTimer: ReturnType<typeof setTimeout> | null = null

function scheduleDraftSave() {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => writeDraftBody(body.value), 400)
}

watch(body, () => scheduleDraftSave())

onMounted(async () => {
  importMeta.value = consumeImport()
  const draft = readDraftBody()
  if (importMeta.value?.body) {
    body.value = importMeta.value.body
  } else if (draft) {
    body.value = draft
  }
  await loadMeta().catch(() => {})
})

onBeforeUnmount(() => {
  if (draftTimer) clearTimeout(draftTimer)
})

function onBack() {
  if (hasUnsavedBody.value) {
    ElMessageBox.confirm('正文尚未发布，确定离开写作页？本地草稿会保留在浏览器中。', '离开写作', {
      confirmButtonText: '离开',
      cancelButtonText: '继续写作',
      type: 'warning',
    })
      .then(() => router.push('/admin/posts'))
      .catch(() => {})
    return
  }
  router.push('/admin/posts')
}

async function goToSavePage() {
  if (!body.value.trim()) {
    ElMessage.warning('请先编写正文，或确认是否留空发布')
    return
  }
  const importTitle = importMeta.value?.title ?? ''
  const importSlug = importMeta.value?.slug
  const title = importTitle || '未命名'
  const prev = peekCreateSave()
  const dirId = prev?.directory_id ?? 0
  const fallbackSlug = importSlug ?? buildManualPostPathSlug('', title).slug
  stashCreateSave({
    body: body.value,
    title: prev?.title ?? title,
    slug: importSlug ?? prev?.slug ?? fallbackSlug,
    directory_id: dirId,
    status: prev?.status ?? 'draft',
    wikilink_slugs: prev?.wikilink_slugs ?? [],
  })
  stashImport({
    title,
    body: body.value,
    slug: importSlug ?? fallbackSlug,
  })
  await router.push('/admin/posts/new/save')
}

useHead({ title: '撰写正文' })

if (import.meta.client) {
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!hasUnsavedBody.value) return
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
      <h1 class="post-compose__bar-center">撰写正文</h1>
      <div class="post-compose__bar-end post-compose__actions">
        <ThemeToggle />
        <el-button
          type="primary"
          :icon="DocumentChecked"
          :loading="loadingMeta"
          @click="goToSavePage"
        >
          保存文章
        </el-button>
      </div>
    </header>

    <main class="post-compose-page__main">
      <div class="post-compose-page__stage">
        <PostImmersiveMdEditor v-model="body" :link-options="linkOptions" />
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
</style>
