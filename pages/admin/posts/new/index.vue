<script setup lang="ts">
import PostCreateModeDialog from '~/components/posts/PostCreateModeDialog.vue'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const router = useRouter()
const { stashCreateSave } = usePostComposeDraft()

function isQuickSkip() {
  return ['1', 'true'].includes(String(route.query.quick ?? ''))
}

const modeChosen = ref(false)
const chooseModeOpen = ref(!isQuickSkip())

function goWrite() {
  router.push('/admin/posts/new/write')
}

function goSave(payload: { title: string; body: string; slug: string }) {
  stashCreateSave({
    title: payload.title,
    body: payload.body,
    slug: payload.slug,
    directory_id: 0,
    status: 'draft',
    wikilink_slugs: [],
  })
  router.push('/admin/posts/new/save')
}

onMounted(() => {
  if (isQuickSkip()) {
    modeChosen.value = true
    goWrite()
  }
})

function onChooseManual() {
  modeChosen.value = true
  goWrite()
}

function onImportedFromMd(payload: { title: string; body: string; slug: string }) {
  modeChosen.value = true
  goSave(payload)
}

function onChooseCancel() {
  modeChosen.value = true
  router.push('/admin/posts')
}

function onModeDialogClosed() {
  if (!modeChosen.value) {
    router.push('/admin/posts')
  }
}

useHead({ title: '新建文章' })
</script>

<template>
  <div class="post-new-entry">
    <PostCreateModeDialog
      v-model="chooseModeOpen"
      @manual="onChooseManual"
      @imported="onImportedFromMd"
      @cancel="onChooseCancel"
      @dialog-closed="onModeDialogClosed"
    />
    <p v-if="!chooseModeOpen" class="post-new-entry__hint">正在进入写作页…</p>
  </div>
</template>

<style scoped lang="less">
.post-new-entry__hint {
  margin: 24px 0;
  font-size: 14px;
  color: var(--admin-muted);
}
</style>
