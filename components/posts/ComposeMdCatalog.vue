<script setup lang="ts">
import { Expand, Fold } from "@element-plus/icons-vue";
import { EditorView } from "@codemirror/view";
import type { EditorView as EditorViewType } from "@codemirror/view";
import {
  buildCatalogTree,
  parseMarkdownHeadings,
  type CatalogHeading,
  type CatalogTreeNode,
} from "~/utils/compose-md-cm-commands";

const props = defineProps<{
  modelValue: string;
  /** 编辑模式：点击时滚动 CodeMirror；阅读模式可省略，由父级处理 heading-click */
  getEditorView?: () => EditorViewType | null | undefined;
}>();

const emit = defineEmits<{
  "heading-click": [item: CatalogHeading];
}>();

const headings = computed(() => parseMarkdownHeadings(props.modelValue));
const tree = computed(() => buildCatalogTree(headings.value));

const activeLine = ref<number | null>(null);
const collapsedLines = ref<Set<number>>(new Set());

function toggleCollapse(line: number, event: Event) {
  event.stopPropagation();
  const next = new Set(collapsedLines.value);
  if (next.has(line)) next.delete(line);
  else next.add(line);
  collapsedLines.value = next;
}

function expandAll() {
  collapsedLines.value = new Set();
}

function collapseAll() {
  const lines = new Set<number>();
  function walk(nodes: CatalogTreeNode[]) {
    for (const n of nodes) {
      if (n.children.length) lines.add(n.heading.line);
      walk(n.children);
    }
  }
  walk(tree.value);
  collapsedLines.value = lines;
}

function selectHeading(item: CatalogHeading) {
  activeLine.value = item.line;
  const view = props.getEditorView?.();
  if (view) {
    const line = view.state.doc.line(Math.min(item.line, view.state.doc.lines));
    view.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: "start", yMargin: 72 }),
      selection: { anchor: line.from },
    });
    view.focus();
  }
  emit("heading-click", item);
}
</script>

<template>
  <div class="compose-md-catalog">
    <div v-if="headings.length" class="compose-md-catalog__toolbar">
      <el-tooltip content="全部展开" placement="bottom">
        <button
          type="button"
          class="compose-md-catalog__toolbar-btn"
          aria-label="全部展开"
          @click="expandAll"
        >
          <el-icon><Expand /></el-icon>
        </button>
      </el-tooltip>
      <el-tooltip content="全部折叠" placement="bottom">
        <button
          type="button"
          class="compose-md-catalog__toolbar-btn"
          aria-label="全部折叠"
          @click="collapseAll"
        >
          <el-icon><Fold /></el-icon>
        </button>
      </el-tooltip>
    </div>

    <p v-if="!headings.length" class="compose-md-catalog__empty">
      使用 <code># 标题</code> 编写章节后，大纲会自动出现在这里。
    </p>

    <ul v-else class="compose-md-catalog__list">
      <PostsComposeMdCatalogNode
        v-for="(node, i) in tree"
        :key="`${node.heading.line}-${i}`"
        :node="node"
        :active-line="activeLine"
        :collapsed-lines="collapsedLines"
        @toggle-collapse="toggleCollapse"
        @select="selectHeading"
      />
    </ul>
  </div>
</template>

<style scoped lang="less">
.compose-md-catalog {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.compose-md-catalog__toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-bottom: 8px;
  padding: 0;
}

.compose-md-catalog__toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--admin-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  :deep(.el-icon) {
    font-size: 16px;
  }

  &:hover {
    background: var(--admin-nav-hover);
    color: var(--el-color-primary);
  }
}

.compose-md-catalog__empty {
  margin: 4px 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--admin-muted);

  code {
    font-size: 12px;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--admin-nav-hover);
  }
}

.compose-md-catalog__list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1 1 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
