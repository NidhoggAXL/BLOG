<script setup lang="ts">
import { CaretBottom, CaretRight } from '@element-plus/icons-vue'
import type { DirectoryRowTree } from '~/composables/buildDirectoryTreeSelect'

defineOptions({ name: 'DirectoryMenuTree' })

const props = withDefaults(
  defineProps<{
    nodes: DirectoryRowTree[]
    depth?: number
  }>(),
  { depth: 0 },
)

const emit = defineEmits<{
  edit: [row: DirectoryRowTree]
  delete: [row: DirectoryRowTree]
}>()

const expandedMap = inject<Record<number, boolean>>('dirMenuExpanded')!

function hasChildren(n: DirectoryRowTree) {
  return !!n.children?.length
}

function isOpen(id: number) {
  return expandedMap[id] === true
}

function toggle(id: number) {
  expandedMap[id] = !isOpen(id)
}

function onRowClick(n: DirectoryRowTree) {
  if (hasChildren(n)) toggle(n.id)
}
</script>

<template>
  <ul class="dir-menu" :class="{ 'dir-menu--root': props.depth === 0 }" role="tree">
    <li v-for="n in props.nodes" :key="n.id" class="dir-menu__item" role="treeitem">
      <div
        class="dir-menu__row"
        :style="{ paddingLeft: `${12 + props.depth * 18}px` }"
        :class="{ 'dir-menu__row--leaf': !hasChildren(n) }"
        @click="onRowClick(n)"
      >
        <span
          v-if="hasChildren(n)"
          class="dir-menu__caret"
          role="button"
          tabindex="0"
          aria-label="展开或折叠"
          @click.stop="toggle(n.id)"
          @keydown.enter.prevent="toggle(n.id)"
          @keydown.space.prevent="toggle(n.id)"
        >
          <el-icon :size="14">
            <CaretBottom v-if="isOpen(n.id)" />
            <CaretRight v-else />
          </el-icon>
        </span>
        <span v-else class="dir-menu__caret dir-menu__caret--spacer" aria-hidden="true" />

        <span class="dir-menu__name">{{ n.name }}</span>
        <code class="dir-menu__slug">{{ n.slug }}</code>
        <span class="dir-menu__meta">
          <span>sort {{ n.sort_order }}</span>
        </span>
        <div class="dir-menu__actions" @click.stop>
          <el-button type="primary" link size="small" @click="emit('edit', n)">编辑</el-button>
          <el-button type="danger" link size="small" @click="emit('delete', n)">删除</el-button>
        </div>
      </div>

      <DirectoryMenuTree
        v-if="hasChildren(n) && isOpen(n.id)"
        :nodes="n.children!"
        :depth="props.depth + 1"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </li>
  </ul>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.dir-menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dir-menu--root {
  border: 1px solid var(--admin-border);
  border-radius: @radius-lg;
  overflow: hidden;
  background: var(--admin-toolbar-bg);
}

.dir-menu__item {
  margin: 0;
}

.dir-menu__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding-right: 12px;
  cursor: default;
  user-select: none;
  border-bottom: 1px solid var(--admin-border);
  color: var(--admin-text);
  transition: background @transition-fast;
}

.dir-menu__row:hover {
  background: var(--admin-nav-hover);
}

.dir-menu__row--leaf {
  cursor: default;
}

.dir-menu__caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: var(--admin-muted);
  cursor: pointer;
  border-radius: @radius-sm;
}

.dir-menu__caret:hover {
  color: var(--admin-text);
  background: var(--admin-nav-hover);
}

.dir-menu__caret--spacer {
  cursor: default;
  pointer-events: none;
  opacity: 0.35;
}

.dir-menu__name {
  font-weight: 600;
  font-size: 14px;
  min-width: 0;
  flex: 1;
}

.dir-menu__slug {
  flex-shrink: 0;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: @radius-sm;
  background: var(--admin-nav-hover);
  border: 1px solid var(--admin-border);
  color: var(--admin-muted);
}

.dir-menu__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--admin-muted);
  flex-shrink: 0;
}

.dir-menu__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
