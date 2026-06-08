<script setup lang="ts">
defineOptions({ name: 'ComposeMdCatalogNode' })

import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import type { CatalogHeading, CatalogTreeNode } from '~/utils/compose-md-cm-commands'

const props = defineProps<{
  node: CatalogTreeNode
  activeLine: number | null
  collapsedLines: Set<number>
}>()

const emit = defineEmits<{
  'toggle-collapse': [line: number, event: Event]
  select: [heading: CatalogHeading]
}>()

const hasChildren = computed(() => props.node.children.length > 0)
const collapsed = computed(() => props.collapsedLines.has(props.node.heading.line))

function indent(level: number) {
  return `${Math.max(0, level - 1) * 5}px`
}
</script>

<template>
  <li class="compose-md-catalog__item">
    <div
      class="compose-md-catalog__row"
      :class="{ 'compose-md-catalog__row--active': activeLine === node.heading.line }"
    >
      <button
        type="button"
        class="compose-md-catalog__toggle"
        :class="{ 'compose-md-catalog__toggle--placeholder': !hasChildren }"
        :aria-label="collapsed ? '展开' : '折叠'"
        @click="hasChildren && emit('toggle-collapse', node.heading.line, $event)"
      >
        <el-icon v-if="hasChildren">
          <ArrowRight v-if="collapsed" />
          <ArrowDown v-else />
        </el-icon>
      </button>
      <button
        type="button"
        class="compose-md-catalog__link"
        :style="{ paddingLeft: indent(node.heading.level) }"
        :title="node.heading.text"
        @click="emit('select', node.heading)"
      >
        {{ node.heading.text }}
      </button>
    </div>
    <ul
      v-if="hasChildren && !collapsed"
      class="compose-md-catalog__list compose-md-catalog__list--nested"
    >
      <PostsComposeMdCatalogNode
        v-for="(child, i) in node.children"
        :key="`${child.heading.line}-${i}`"
        :node="child"
        :active-line="activeLine"
        :collapsed-lines="collapsedLines"
        @toggle-collapse="(line, e) => emit('toggle-collapse', line, e)"
        @select="(h) => emit('select', h)"
      />
    </ul>
  </li>
</template>

<style scoped lang="less">
.compose-md-catalog__list--nested {
  list-style: none;
  margin: 0 0 0 3px;
  padding: 0 0 0 4px;
  border-left: 1px solid var(--admin-border);
}

.compose-md-catalog__item {
  margin: 1px 0;
}

.compose-md-catalog__row {
  display: flex;
  align-items: center;
  gap: 2px;
  border-radius: 6px;

  &--active .compose-md-catalog__link {
    background: var(--admin-nav-hover);
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.compose-md-catalog__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--admin-muted);
  cursor: pointer;

  :deep(.el-icon) {
    font-size: 14px;
  }

  &:hover {
    background: var(--admin-nav-hover);
    color: var(--admin-text);
  }

  &--placeholder {
    visibility: hidden;
    pointer-events: none;
  }
}

.compose-md-catalog__link {
  flex: 1;
  min-width: 0;
  padding: 6px 6px 6px 2px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--admin-text);
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    background: var(--admin-nav-hover);
    color: var(--el-color-primary);
  }
}
</style>
