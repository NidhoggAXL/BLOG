<script setup lang="ts">
import { CaretBottom, CaretRight, Folder } from '@element-plus/icons-vue'
import type { DirectoryNavNode } from '~/composables/buildDirectoryNavTree'

defineOptions({ name: 'PostDirectoryNav' })

const props = defineProps<{
  nodes: DirectoryNavNode[]
  selectedId: number | null
  depth?: number
}>()

const emit = defineEmits<{
  select: [id: number]
}>()

const ui = usePostExplorerUiStore()

function hasChildren(n: DirectoryNavNode) {
  return n.children.length > 0
}

function isOpen(id: number) {
  return ui.isOpen(id)
}

function onToggle(id: number) {
  ui.toggle(id)
}

function onSelect(id: number) {
  emit('select', id)
}
</script>

<template>
  <ul class="dir-nav" :class="{ 'dir-nav--root': (depth ?? 0) === 0 }" role="tree">
    <li v-for="n in nodes" :key="n.id" class="dir-nav__item" role="treeitem" :aria-expanded="hasChildren(n) ? isOpen(n.id) : undefined">
      <div class="dir-nav__row" :class="{ 'dir-nav__row--active': selectedId === n.id }" :style="{ paddingLeft: `${4 + (depth ?? 0) * 16}px` }">
        <span
          v-if="hasChildren(n)"
          class="dir-nav__caret"
          role="button"
          tabindex="0"
          :aria-label="isOpen(n.id) ? '折叠' : '展开'"
          @click.stop="onToggle(n.id)"
          @keydown.enter.prevent="onToggle(n.id)"
          @keydown.space.prevent="onToggle(n.id)"
        >
          <el-icon :size="14">
            <CaretBottom v-if="isOpen(n.id)" />
            <CaretRight v-else />
          </el-icon>
        </span>
        <span v-else class="dir-nav__caret dir-nav__caret--spacer" aria-hidden="true" />

        <button
          type="button"
          class="dir-nav__body"
          :aria-selected="selectedId === n.id"
          @click="onSelect(n.id)"
        >
          <el-icon class="dir-nav__icon" :size="16"><Folder /></el-icon>
          <span class="dir-nav__name">{{ n.name }}</span>
          <code class="dir-nav__slug">{{ n.slug }}</code>
        </button>
      </div>

      <PostDirectoryNav
        v-if="hasChildren(n) && isOpen(n.id)"
        :nodes="n.children"
        :selected-id="selectedId"
        :depth="(depth ?? 0) + 1"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.dir-nav {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dir-nav--root {
  border: 1px solid var(--admin-border);
  border-radius: @radius-lg;
  overflow: hidden;
  background: var(--admin-toolbar-bg);
}

.dir-nav__item {
  margin: 0;
}

.dir-nav__row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding-right: 8px;
  border-bottom: 1px solid var(--admin-border);
  transition: background @transition-fast;
}

.dir-nav__row:hover {
  background: var(--admin-nav-hover);
}

.dir-nav__row--active {
  background: var(--admin-nav-active-bg);
  box-shadow: inset 3px 0 0 var(--accent);
}

.dir-nav__caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  margin-left: 4px;
  color: var(--admin-muted);
  cursor: pointer;
  border-radius: @radius-sm;
}

.dir-nav__caret:hover {
  color: var(--admin-text);
  background: var(--admin-nav-hover);
}

.dir-nav__caret--spacer {
  cursor: default;
  pointer-events: none;
  opacity: 0.35;
}

.dir-nav__body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 6px 4px 6px 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.dir-nav__icon {
  flex-shrink: 0;
  color: #c9a227;
}

.dir-nav__name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dir-nav__slug {
  flex-shrink: 0;
  max-width: 88px;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: @radius-sm;
  background: var(--admin-nav-hover);
  border: 1px solid var(--admin-border);
  color: var(--admin-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
