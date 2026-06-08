<script setup lang="ts">
import { Document, EditPen, Upload } from '@element-plus/icons-vue'

defineOptions({ name: 'PostCreateModeDialog' })

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  manual: []
  imported: [payload: { title: string; body: string; slug: string; fileName: string }]
  cancel: []
  dialogClosed: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const fileInputRef = ref<HTMLInputElement | null>(null)

function onManual() {
  emit('manual')
  visible.value = false
}

function openFilePicker() {
  fileInputRef.value?.click()
}

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const text = await file.text()
    const payload = buildMdImportPayload(file.name, text)
    emit('imported', {
      title: payload.title,
      body: payload.body,
      slug: payload.slug,
      fileName: payload.fileName,
    })
    visible.value = false
    ElMessage.success(`已载入「${file.name}」，请在保存页确认目录与双链。`)
  } catch {
    ElMessage.error('读取文件失败，请重试或换用 UTF-8 编码的 .md 文件')
  }
}

function onCancel() {
  emit('cancel')
  visible.value = false
}

function onClosed() {
  // 仅在未完成选择时视为放弃进入新建页（由父组件配合 modeChosen）
  emit('dialogClosed')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="创建文章"
    width="520px"
    align-center
    destroy-on-close
    class="post-create-mode-dlg"
    @closed="onClosed"
  >
    <p class="post-create-mode-dlg__lead">
      请先专注撰写 Markdown 正文；导入文件或完成后在「保存文章」页填写标题、目录与双链。
    </p>

    <div class="post-create-mode-dlg__grid">
      <button type="button" class="mode-card" @click="onManual">
        <el-icon class="mode-card__icon" :size="28"><EditPen /></el-icon>
        <span class="mode-card__title">手动创建</span>
        <span class="mode-card__desc">进入全屏写作页，先写正文，再进入保存页填写目录与标题。</span>
      </button>

      <button type="button" class="mode-card mode-card--accent" @click="openFilePicker">
        <el-icon class="mode-card__icon" :size="28"><Upload /></el-icon>
        <span class="mode-card__title">上传 Markdown</span>
        <span class="mode-card__desc">选择本地 .md 文件，进入保存页设置目录、状态与双链。</span>
      </button>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      class="post-create-mode-dlg__file"
      accept=".md,.markdown,.mdown,.mkd,text/markdown"
      @change="onFileChange"
    />

    <p class="post-create-mode-dlg__tip">
      <el-icon :size="14"><Document /></el-icon>
      支持 UTF-8；标题与 slug 与文件名一致，可在发布设置中修改。
    </p>

    <template #footer>
      <el-button @click="onCancel">返回文章列表</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.post-create-mode-dlg__lead {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--admin-muted);
}

.post-create-mode-dlg__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 540px) {
  .post-create-mode-dlg__grid {
    grid-template-columns: 1fr;
  }
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 14px;
  text-align: left;
  border: 1px solid var(--admin-border);
  border-radius: @radius-lg;
  background: var(--admin-toolbar-bg);
  color: var(--admin-text);
  cursor: pointer;
  transition:
    border-color @transition-fast,
    box-shadow @transition-fast,
    background @transition-fast;
  font: inherit;
}

.mode-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}

.mode-card--accent:hover {
  border-color: var(--el-color-primary);
}

.mode-card__icon {
  color: var(--el-color-primary);
}

.mode-card__title {
  font-weight: 700;
  font-size: 15px;
}

.mode-card__desc {
  font-size: 12px;
  line-height: 1.45;
  color: var(--admin-muted);
}

.post-create-mode-dlg__file {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.post-create-mode-dlg__tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--admin-muted);
}

.post-create-mode-dlg__tip code {
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--admin-nav-hover);
}
</style>
