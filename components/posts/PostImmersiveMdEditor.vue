<script setup lang="ts">
import type { EditorView } from "@codemirror/view";
import type { ComposeMdToolDirective } from "~/constants/compose-md-tools";
import type { CatalogHeading } from "~/utils/compose-md-cm-commands";
import type { WikilinkLinkOption } from "~/composables/useWikilinkTextareaAutocomplete";
import { insertComposeCallout, runComposeMdCommand } from "~/utils/compose-md-cm-commands";
import type { CalloutType } from "~/utils/markdownCallouts";
import { formatComposeMarkdown } from "~/utils/format-compose-markdown";
import { Menu, MagicStick, RefreshLeft, RefreshRight } from "@element-plus/icons-vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    linkOptions?: WikilinkLinkOption[];
    excludeSlugs?: string[];
    placeholder?: string;
  }>(),
  {
    linkOptions: () => [],
    excludeSlugs: () => [],
    placeholder: "开始写作… 输入 [[ 可联想已有文章",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const cmEditorRef = ref<{
  getEditorView: () => EditorView | null;
  focus: () => void;
} | null>(null);
const previewPaneRef = ref<{ scrollToAnchor: (anchor: string) => void } | null>(
  null,
);
let cmView: EditorView | null = null;

const outlineOpen = ref(true);

const content = computed({
  get: () => props.modelValue,
  set: (v: string) => emit("update:modelValue", v),
});

function onEditorReady(view: EditorView) {
  cmView = view;
}

function getEditorView() {
  return cmView ?? cmEditorRef.value?.getEditorView() ?? null;
}

function runTool(directive: ComposeMdToolDirective) {
  const view = getEditorView();
  if (!view) return;
  runComposeMdCommand(view, directive);
}

function onInsertCallout(type: CalloutType) {
  const view = getEditorView();
  if (!view) return;
  insertComposeCallout(view, type);
}

function undo() {
  const view = getEditorView();
  if (view) {
    import("@codemirror/commands").then(({ undo: cmUndo }) => {
      cmUndo(view);
      view.focus();
    });
  }
}

function redo() {
  const view = getEditorView();
  if (view) {
    import("@codemirror/commands").then(({ redo: cmRedo }) => {
      cmRedo(view);
      view.focus();
    });
  }
}

const formatting = ref(false);

function onCatalogHeading(item: CatalogHeading) {
  previewPaneRef.value?.scrollToAnchor(item.anchor);
}

function formatDocument() {
  if (formatting.value) return;
  const raw = content.value;
  if (!raw.trim()) {
    ElMessage.info("暂无内容可格式化");
    return;
  }

  formatting.value = true;
  try {
    const next = formatComposeMarkdown(raw);
    const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/\n+$/, "");
    if (norm(next) === norm(raw)) {
      ElMessage.info("内容已是规范格式");
      return;
    }
    content.value = next;
    ElMessage.success("已按 Markdown 规范格式化");
  } catch {
    ElMessage.error("格式化失败，请稍后重试");
  } finally {
    formatting.value = false;
  }
}

</script>

<template>
  <ClientOnly>
    <div
      class="compose-editor-card post-immersive-md-editor"
      :class="{ 'compose-editor-card--outline-open': outlineOpen }"
    >
      <div class="compose-editor-card__chrome">
        <div class="compose-editor-card__chrome-start">
          <el-tooltip content="文档大纲" placement="bottom">
            <el-button
              class="compose-chrome-btn"
              circle
              :type="outlineOpen ? 'primary' : 'default'"
              :icon="Menu"
              @click="outlineOpen = !outlineOpen"
            />
          </el-tooltip>
        </div>

        <PostsComposeMdToolbar
          class="compose-editor-card__chrome-tools"
          variant="chrome"
          @tool="runTool"
          @callout="onInsertCallout"
        />

        <div class="compose-editor-card__chrome-actions">
          <el-tooltip content="格式化 Markdown" placement="bottom">
            <el-button
              class="compose-chrome-btn"
              circle
              text
              :icon="MagicStick"
              :loading="formatting"
              @click="formatDocument"
            />
          </el-tooltip>
          <el-tooltip content="撤销" placement="bottom">
            <el-button
              class="compose-chrome-btn"
              circle
              text
              :icon="RefreshLeft"
              @click="undo"
            />
          </el-tooltip>
          <el-tooltip content="重做" placement="bottom">
            <el-button
              class="compose-chrome-btn"
              circle
              text
              :icon="RefreshRight"
              @click="redo"
            />
          </el-tooltip>
        </div>
      </div>

      <div class="compose-editor-card__body">
        <aside
          class="compose-column compose-column--outline"
          :aria-hidden="!outlineOpen"
        >
          <div class="compose-panel-card compose-panel-card--catalog">
            <header class="compose-panel-card__head">
              <p class="compose-panel-card__title">文档大纲</p>
            </header>
            <div class="compose-panel-card__content">
              <PostsComposeMdCatalog
                :model-value="content"
                :get-editor-view="getEditorView"
                @heading-click="onCatalogHeading"
              />
            </div>
          </div>
        </aside>

        <section class="compose-column compose-column--source">
          <div class="compose-panel-card compose-panel-card--editor">
            <header class="compose-panel-card__head">
              <p class="compose-panel-card__title">Markdown 源码</p>
            </header>
            <div class="compose-panel-card__content">
              <PostsPostComposeCmLiveEditor
                ref="cmEditorRef"
                v-model="content"
                class="compose-cm-host"
                :source-mode="true"
                :placeholder="placeholder"
                :link-options="linkOptions"
                :exclude-slugs="excludeSlugs"
                @ready="onEditorReady"
              />
            </div>
          </div>
        </section>

        <section class="compose-column compose-column--preview">
          <div class="compose-panel-card compose-panel-card--preview">
            <header class="compose-panel-card__head">
              <p class="compose-panel-card__title">渲染预览</p>
            </header>
            <div class="compose-panel-card__content compose-panel-card__content--preview">
              <PostsComposeMdPreviewPane
                ref="previewPaneRef"
                :markdown="content"
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    <template #fallback>
      <div class="compose-editor-card compose-editor-card--loading">
        加载编辑器…
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped lang="less">
@import "~/assets/styles/variables.less";

.compose-scroll-y() {
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

.compose-editor-card {
  --compose-grid-outline: 0fr;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  height: 100%;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  gap: 12px;
}

.compose-editor-card--outline-open {
  --compose-grid-outline: minmax(0, var(--post-compose-outline-width, 220px));
}

.compose-editor-card--loading {
  align-items: center;
  justify-content: center;
  min-height: 320px;
  color: var(--admin-muted);
  background: var(--post-read-surface, var(--el-fill-color-blank));
  border: 1px solid var(--post-read-border, var(--admin-border));
  border-radius: 14px;
  box-shadow: var(--post-read-shadow, 0 8px 32px rgba(0, 0, 0, 0.06));
}

.compose-editor-card__chrome {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-height: 48px;
  padding: 6px 12px;
  border: 1px solid var(--post-read-border, var(--admin-border));
  border-radius: 14px;
  background: var(--post-read-surface, var(--el-fill-color-blank));
  box-shadow: var(--post-read-shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
}

.compose-editor-card__chrome-start {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.compose-editor-card__chrome-tools {
  flex: 1;
  min-width: 0;
}

.compose-editor-card__chrome-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-left: 8px;
  border-left: 1px solid var(--post-read-border, var(--admin-border));
}

.compose-chrome-btn {
  width: 36px !important;
  height: 36px !important;

  :deep(.el-icon) {
    font-size: 18px;
  }
}

.compose-editor-card__body {
  display: grid;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  width: 100%;
  grid-template-columns: var(--compose-grid-outline) minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--post-compose-panel-gap, 12px);
  overflow: hidden;
  align-items: stretch;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.compose-column {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  transition: opacity 0.2s ease;

  &[aria-hidden='true'] {
    opacity: 0;
    pointer-events: none;
    overflow: hidden;
  }
}

.compose-panel-card--editor .compose-panel-card__content {
  padding: 0 0 8px;
}

.compose-panel-card__content--preview {
  padding: 4px 14px 14px;
  .compose-scroll-y();
}

.compose-cm-host {
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  width: 100%;
}

@media (max-width: 1100px) {
  .compose-editor-card__body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(200px, 1fr) minmax(200px, 1fr);
    overflow-y: auto;
    .compose-scroll-y();
  }

  .compose-column--outline[aria-hidden='false'] {
    max-height: 200px;
  }

  .compose-editor-card__chrome {
    flex-wrap: wrap;
    gap: 8px;
  }

  .compose-editor-card__chrome-tools {
    order: 3;
    flex: 1 1 100%;
    min-width: 0;
  }

  .compose-editor-card__chrome-actions {
    border-left: none;
    padding-left: 0;
  }
}
</style>
