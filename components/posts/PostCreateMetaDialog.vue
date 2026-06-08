<script setup lang="ts">
import { Check } from '@element-plus/icons-vue'
import type { DirectoryTreeNode } from '~/composables/buildDirectoryTreeSelect'
import type { WikilinkLinkOption } from '~/composables/useWikilinkTextareaAutocomplete'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    mode?: 'create' | 'edit'
    treeSelectData: DirectoryTreeNode[]
    linkOptions: WikilinkLinkOption[]
    markdownBody?: string
    initialTitle?: string
    initialDirectoryId?: number
    initialStatus?: 'draft' | 'published' | 'archived'
    initialWikilinkSlugs?: string[]
    submitting?: boolean
  }>(),
  { mode: 'create' },
)

const dialogTitle = computed(() => (props.mode === 'edit' ? '文章设置' : '发布设置'))
const leadText = computed(() =>
  props.mode === 'edit'
    ? '修改标题、目录、状态或双链；正文在编辑区已实时保存为当前内容。'
    : '正文已在编辑区写好。请填写标题、目录等元数据后创建文章；标题与 slug 相同。',
)
const continueLabel = computed(() => (props.mode === 'edit' ? '继续编辑' : '继续写作'))
const submitLabel = computed(() => (props.mode === 'edit' ? '保存文章' : '创建文章'))

const emit = defineEmits<{
  'update:modelValue': [boolean]
  submit: [payload: {
    title: string
    slug: string
    directory_id: number
    status: 'draft' | 'published' | 'archived'
    wikilink_slugs: string[]
  }]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const metaFormRef = ref<InstanceType<typeof import('~/components/posts/PostSaveMetaForm.vue').default> | null>(null)

function onConfirm() {
  const payload = metaFormRef.value?.buildPayload()
  if (!payload) return
  emit('submit', payload)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="720px"
    align-center
    destroy-on-close
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    class="post-create-meta-dlg"
  >
    <p class="post-create-meta-dlg__lead">{{ leadText }}</p>

    <PostsPostSaveMetaForm
      v-if="visible"
      ref="metaFormRef"
      :tree-select-data="treeSelectData"
      :link-options="linkOptions"
      :markdown-body="markdownBody"
      :initial-title="initialTitle"
      :initial-directory-id="initialDirectoryId"
      :initial-status="initialStatus"
      :initial-wikilink-slugs="initialWikilinkSlugs"
    />

    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">{{ continueLabel }}</el-button>
      <el-button type="primary" :loading="submitting" :icon="Check" @click="onConfirm">
        {{ submitLabel }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="less">
.post-create-meta-dlg__lead {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--admin-muted);
}
</style>
