<script setup lang="ts">
defineOptions({ name: "BlogHeadingTocNode" });

import { ArrowDown, ArrowRight } from "@element-plus/icons-vue";
import type { TocTreeNode } from "~/utils/extractHeadings";

const props = defineProps<{
  node: TocTreeNode;
  collapsedIds: Set<string>;
}>();

const emit = defineEmits<{
  "toggle-collapse": [id: string, event: Event];
  "scroll-to": [id: string];
}>();

const hasChildren = computed(() => props.node.children.length > 0);
const collapsed = computed(() => props.collapsedIds.has(props.node.heading.id));
</script>

<template>
  <li class="heading-toc__item">
    <div class="heading-toc__row">
      <button
        type="button"
        class="heading-toc__toggle"
        :class="{ 'heading-toc__toggle--placeholder': !hasChildren }"
        :aria-label="collapsed ? '展开' : '折叠'"
        @click="hasChildren && emit('toggle-collapse', node.heading.id, $event)"
      >
        <el-icon v-if="hasChildren">
          <ArrowRight v-if="collapsed" />
          <ArrowDown v-else />
        </el-icon>
      </button>
      <a
        :href="`#${node.heading.id}`"
        class="heading-toc__link"
        :class="`level-${node.heading.level}`"
        :title="node.heading.text"
        @click.prevent="emit('scroll-to', node.heading.id)"
      >
        {{ node.heading.text }}
      </a>
    </div>
    <ul
      v-if="hasChildren && !collapsed"
      class="heading-toc__list heading-toc__list--nested"
    >
      <BlogHeadingTocNode
        v-for="child in node.children"
        :key="child.heading.id"
        :node="child"
        :collapsed-ids="collapsedIds"
        @toggle-collapse="(id, e) => emit('toggle-collapse', id, e)"
        @scroll-to="(id) => emit('scroll-to', id)"
      />
    </ul>
  </li>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.heading-toc__list--nested {
  list-style: none;
  margin: 0 0 0 3px;
  padding: 0 0 0 4px;
  border-left: 1px solid var(--border);
}

.heading-toc__item {
  margin: 1px 0;
}

.heading-toc__row {
  display: flex;
  align-items: center;
  gap: 2px;
  border-radius: 4px;
}

.heading-toc__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;

  :deep(.el-icon) {
    font-size: 12px;
  }

  &:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  &--placeholder {
    visibility: hidden;
    pointer-events: none;
  }
}

.heading-toc__link {
  flex: 1;
  min-width: 0;
  display: block;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--text-secondary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    background 0.12s,
    color 0.12s;

  &.level-1 {
    font-weight: 600;
    color: var(--text);
  }

  &:hover {
    background: var(--bg-hover);
    color: var(--accent);
  }
}
</style>
