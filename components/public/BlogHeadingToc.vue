<script setup lang="ts">
import { Expand, Fold } from "@element-plus/icons-vue";
import type { TocHeading } from "~/types/blog";
import { buildTocTree, type TocTreeNode } from "~/utils/extractHeadings";

const props = defineProps<{
  headings: TocHeading[];
  compact?: boolean;
}>();

const tree = computed(() => buildTocTree(props.headings));
const collapsedIds = ref<Set<string>>(new Set());

function toggleCollapse(id: string, event: Event) {
  event.stopPropagation();
  const next = new Set(collapsedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsedIds.value = next;
}

function expandAll() {
  collapsedIds.value = new Set();
}

function collapseAll() {
  const ids = new Set<string>();
  function walk(nodes: TocTreeNode[]) {
    for (const n of nodes) {
      if (n.children.length) ids.add(n.heading.id);
      walk(n.children);
    }
  }
  walk(tree.value);
  collapsedIds.value = ids;
}

function scrollToAnchor(id: string) {
  if (!import.meta.client) {
    return;
  }
  const el = document.getElementById(id);
  if (!el) {
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}
</script>

<template>
  <nav v-if="headings.length" class="heading-toc">
    <header v-if="!compact" class="heading-toc__head">
      <h2 class="heading-toc__title">大纲</h2>
    </header>

    <div class="heading-toc__toolbar">
      <button
        type="button"
        class="heading-toc__toolbar-btn"
        title="全部展开"
        aria-label="全部展开"
        @click="expandAll"
      >
        <el-icon><Expand /></el-icon>
      </button>
      <button
        type="button"
        class="heading-toc__toolbar-btn"
        title="全部折叠"
        aria-label="全部折叠"
        @click="collapseAll"
      >
        <el-icon><Fold /></el-icon>
      </button>
    </div>

    <ul class="heading-toc__list no-scrollbar">
      <BlogHeadingTocNode
        v-for="node in tree"
        :key="node.heading.id"
        :node="node"
        :collapsed-ids="collapsedIds"
        @toggle-collapse="toggleCollapse"
        @scroll-to="scrollToAnchor"
      />
    </ul>
  </nav>
  <p v-else class="toc-empty">本文暂无标题大纲</p>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.heading-toc {
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.heading-toc__head {
  flex-shrink: 0;
  margin-bottom: 0.75rem;
}

.heading-toc__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.02em;
}

.heading-toc__toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-bottom: 0.5rem;
}

.heading-toc__toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;

  :deep(.el-icon) {
    font-size: 14px;
  }

  &:hover {
    background: var(--bg-hover);
    color: var(--accent);
  }
}

.heading-toc__list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.toc-empty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
