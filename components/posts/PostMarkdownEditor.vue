<script setup lang="ts">
import {
  applyWikilinkAutocompleteSelection,
  filterWikilinkLinkOptions,
  getWikilinkAutocompleteContext,
  type WikilinkLinkOption,
} from '~/composables/useWikilinkTextareaAutocomplete'
import { applyWikilinkMarkdownLinks } from '~/utils/wikilinkShared'
import { renderMarkdownPipeline } from '~/utils/markedSetup'

const props = withDefaults(
  defineProps<{
    modelValue: string
    rows?: number
    placeholder?: string
    linkOptions?: WikilinkLinkOption[]
    /** 编辑时排除自身 slug，避免链到自己 */
    excludeSlugs?: string[]
  }>(),
  {
    rows: 16,
    placeholder: '支持 Markdown；输入 [[ 可联想已有文章',
    linkOptions: () => [],
    excludeSlugs: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

type EditorMode = 'edit' | 'preview' | 'split'

const mode = ref<EditorMode>('split')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewHtml = ref('')
const previewLoading = ref(false)

const excludeSet = computed(() => new Set(props.excludeSlugs))

const wikilinkCtx = ref<ReturnType<typeof getWikilinkAutocompleteContext>>(null)
const suggestOpen = ref(false)
const suggestIndex = ref(0)
const suggestItems = ref<WikilinkLinkOption[]>([])

let previewTimer: ReturnType<typeof setTimeout> | null = null

function lookupMapFromOptions(): Map<string, string> {
  const map = new Map<string, string>()
  for (const o of props.linkOptions) {
    const slug = o.value.toLowerCase()
    map.set(slug, o.value)
    if (o.label.trim()) {
      map.set(o.label.trim().toLowerCase(), o.value)
    }
  }
  return map
}

async function refreshPreview() {
  const md = props.modelValue
  if (!md.trim()) {
    previewHtml.value = ''
    return
  }
  previewLoading.value = true
  try {
    previewHtml.value = await renderMarkdownPipeline(md, (source) =>
      applyWikilinkMarkdownLinks(source, lookupMapFromOptions()),
    )
  } catch {
    previewHtml.value = '<p class="post-md-editor__preview-error">预览渲染失败</p>'
  } finally {
    previewLoading.value = false
  }
}

function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    if (mode.value !== 'edit') refreshPreview()
  }, 320)
}

watch(
  () => props.modelValue,
  () => schedulePreview(),
  { immediate: true },
)

watch(mode, (m) => {
  if (m !== 'edit') refreshPreview()
})

onMounted(() => {
  if (mode.value !== 'edit') refreshPreview()
})

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
})

function updateSuggest() {
  const el = textareaRef.value
  if (!el || !props.linkOptions.length) {
    suggestOpen.value = false
    wikilinkCtx.value = null
    return
  }
  const ctx = getWikilinkAutocompleteContext(props.modelValue, el.selectionStart)
  wikilinkCtx.value = ctx
  if (!ctx) {
    suggestOpen.value = false
    suggestItems.value = []
    return
  }
  const items = filterWikilinkLinkOptions(props.linkOptions, ctx.query, excludeSet.value)
  suggestItems.value = items
  suggestOpen.value = items.length > 0
  suggestIndex.value = 0
}

function emitValue(next: string) {
  emit('update:modelValue', next)
  schedulePreview()
}

function onInput(e: Event) {
  const v = (e.target as HTMLTextAreaElement).value
  emitValue(v)
  nextTick(updateSuggest)
}

function onKeydown(e: KeyboardEvent) {
  if (!suggestOpen.value || !wikilinkCtx.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    suggestIndex.value = (suggestIndex.value + 1) % suggestItems.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    suggestIndex.value =
      (suggestIndex.value - 1 + suggestItems.value.length) % suggestItems.value.length
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    pickSuggestion(suggestItems.value[suggestIndex.value]!)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    suggestOpen.value = false
  }
}

function pickSuggestion(opt: WikilinkLinkOption) {
  const el = textareaRef.value
  const ctx = wikilinkCtx.value
  if (!el || !ctx) return
  const { text, cursor } = applyWikilinkAutocompleteSelection(props.modelValue, ctx, opt.value)
  emitValue(text)
  suggestOpen.value = false
  wikilinkCtx.value = null
  nextTick(() => {
    el.focus()
    el.setSelectionRange(cursor, cursor)
  })
}

function onClick() {
  updateSuggest()
}

function wrapSelection(before: string, after: string, placeholder = '') {
  const el = textareaRef.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = props.modelValue.slice(start, end) || placeholder
  const next =
    props.modelValue.slice(0, start) + before + selected + after + props.modelValue.slice(end)
  emitValue(next)
  nextTick(() => {
    const cursorStart = start + before.length
    const cursorEnd = cursorStart + selected.length
    el.focus()
    el.setSelectionRange(cursorStart, cursorEnd)
  })
}

function insertLinePrefix(prefix: string) {
  const el = textareaRef.value
  if (!el) return
  const start = el.selectionStart
  const lineStart = props.modelValue.lastIndexOf('\n', start - 1) + 1
  const next = props.modelValue.slice(0, lineStart) + prefix + props.modelValue.slice(lineStart)
  emitValue(next)
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + prefix.length, start + prefix.length)
  })
}

function onBlur() {
  window.setTimeout(() => {
    suggestOpen.value = false
  }, 150)
}

const toolbarItems = [
  { label: 'B', title: '粗体', action: () => wrapSelection('**', '**', '粗体') },
  { label: 'I', title: '斜体', action: () => wrapSelection('*', '*', '斜体') },
  { label: 'H', title: '标题', action: () => insertLinePrefix('## ') },
  { label: '链', title: '链接', action: () => wrapSelection('[', '](url)', '文字') },
  { label: '码', title: '行内代码', action: () => wrapSelection('`', '`', 'code') },
  { label: '[]', title: '双链 [[slug]]', action: () => wrapSelection('[[', ']]', 'slug') },
  { label: '-', title: '列表', action: () => insertLinePrefix('- ') },
  { label: '>', title: '引用', action: () => insertLinePrefix('> ') },
] as const
</script>

<template>
  <div class="post-md-editor">
    <div class="post-md-editor__toolbar">
      <el-radio-group v-model="mode" size="small" class="post-md-editor__modes">
        <el-radio-button value="edit">编辑</el-radio-button>
        <el-radio-button value="split">分屏</el-radio-button>
        <el-radio-button value="preview">预览</el-radio-button>
      </el-radio-group>
      <div v-show="mode !== 'preview'" class="post-md-editor__fmt">
        <el-button
          v-for="item in toolbarItems"
          :key="item.label"
          size="small"
          :title="item.title"
          @click="item.action"
        >
          {{ item.label }}
        </el-button>
      </div>
      <span v-if="suggestOpen" class="post-md-editor__suggest-hint">↑↓ 选择 · Enter 插入双链</span>
    </div>

    <div
      class="post-md-editor__panes"
      :class="{
        'post-md-editor__panes--edit': mode === 'edit',
        'post-md-editor__panes--preview': mode === 'preview',
        'post-md-editor__panes--split': mode === 'split',
      }"
    >
      <div v-show="mode !== 'preview'" class="post-md-editor__edit-wrap">
        <textarea
          ref="textareaRef"
          class="post-md-editor__textarea"
          :value="modelValue"
          :rows="rows"
          :placeholder="placeholder"
          spellcheck="false"
          @input="onInput"
          @keydown="onKeydown"
          @click="onClick"
          @keyup="updateSuggest"
          @blur="onBlur"
        />
        <ul v-if="suggestOpen" class="post-md-editor__suggest" role="listbox">
          <li
            v-for="(opt, i) in suggestItems"
            :key="opt.value"
            class="post-md-editor__suggest-item"
            :class="{ 'post-md-editor__suggest-item--active': i === suggestIndex }"
            role="option"
            @mousedown.prevent="pickSuggestion(opt)"
          >
            <div class="post-md-editor__suggest-main">
              <span class="post-md-editor__suggest-title">{{ opt.label }}</span>
              <span v-if="opt.directoryPath" class="post-md-editor__suggest-path">{{
                opt.directoryPath
              }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div v-show="mode !== 'edit'" class="post-md-editor__preview-wrap">
        <div v-if="previewLoading" class="post-md-editor__preview-loading">渲染中…</div>
        <div
          v-else-if="previewHtml"
          class="post-md-editor__preview markdown-body"
          v-html="previewHtml"
        />
        <p v-else class="post-md-editor__preview-empty">预览将显示在此处</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.post-md-editor {
  width: 100%;
  max-width: 960px;
  border: 1px solid var(--el-border-color);
  border-radius: @radius-md;
  overflow: hidden;
  background: var(--el-fill-color-blank);
}

.post-md-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);
}

.post-md-editor__fmt {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.post-md-editor__fmt :deep(.el-button) {
  min-width: 32px;
  padding: 4px 8px;
  font-family: ui-monospace, monospace;
  font-weight: 600;
}

.post-md-editor__suggest-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--admin-muted);
}

.post-md-editor__panes {
  display: grid;
  min-height: 280px;
}

.post-md-editor__panes--edit {
  grid-template-columns: 1fr;
}

.post-md-editor__panes--preview {
  grid-template-columns: 1fr;
}

.post-md-editor__panes--split {
  grid-template-columns: 1fr 1fr;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.post-md-editor__edit-wrap {
  position: relative;
  min-height: 0;
  border-right: 1px solid var(--el-border-color-lighter);

  .post-md-editor__panes--preview & {
    border-right: none;
  }

  .post-md-editor__panes--split & {
    @media (max-width: 900px) {
      border-right: none;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }
  }
}

.post-md-editor__textarea {
  display: block;
  width: 100%;
  min-height: 100%;
  padding: 12px 14px;
  margin: 0;
  border: none;
  outline: none;
  resize: vertical;
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-blank);
  box-sizing: border-box;
}

.post-md-editor__suggest {
  position: absolute;
  z-index: 20;
  left: 12px;
  right: 12px;
  bottom: 8px;
  max-height: 220px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  overflow-y: auto;
  border-radius: @radius-sm;
  border: 1px solid var(--el-border-color);
  background: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
}

.post-md-editor__suggest-item {
  display: block;
  padding: 8px 12px;
  cursor: pointer;
  color: var(--el-text-color-primary);

  &:hover,
  &--active {
    background: var(--el-fill-color-light);
  }
}

.post-md-editor__suggest-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.post-md-editor__suggest-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-md-editor__suggest-path {
  font-size: 12px;
  line-height: 1.35;
  color: var(--admin-muted);
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-md-editor__preview-wrap {
  min-height: 200px;
  max-height: 70vh;
  overflow: auto;
  padding: 12px 16px;
  background: var(--el-fill-color-blank);
}

.post-md-editor__preview-loading,
.post-md-editor__preview-empty {
  margin: 0;
  font-size: 13px;
  color: var(--admin-muted);
}

.post-md-editor__preview-error {
  color: var(--el-color-danger);
}

.post-md-editor__preview :deep(pre) {
  overflow-x: auto;
}
</style>
