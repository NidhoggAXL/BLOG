<script setup lang="ts">
import { CaretBottom, CaretRight, Document, Folder } from '@element-plus/icons-vue'
import type { ExplorerNode } from '~/composables/buildPostExplorerTree'

defineOptions({ name: 'PostExplorerTree' })

const props = withDefaults(
  defineProps<{
    nodes: ExplorerNode[]
    depth?: number
  }>(),
  { depth: 0 },
)

const ui = usePostExplorerUiStore()

function hasChildren(n: ExplorerNode) {
  return n.kind === 'dir' && !!n.children?.length
}

function isOpen(id: number) {
  return ui.isOpen(id)
}

function toggle(id: number) {
  ui.toggle(id)
}

function onDirRowClick(n: Extract<ExplorerNode, { kind: 'dir' }>) {
  if (hasChildren(n)) toggle(n.id)
}

function statusTagType(status: string) {
  if (status === 'published') return 'success'
  if (status === 'archived') return 'info'
  return 'warning'
}

function statusLabel(status: string) {
  if (status === 'published') return '已发布'
  if (status === 'archived') return '已归档'
  return '草稿'
}
</script>

<template>
  <ul class="post-explorer" :class="{ 'post-explorer--root': props.depth === 0 }" role="tree">
    <template v-for="n in props.nodes" :key="n.kind === 'dir' ? `d-${n.id}` : `p-${n.id}`">
      <li v-if="n.kind === 'dir'" class="post-explorer__item" role="treeitem">
        <div
          class="post-explorer__row post-explorer__row--dir"
          :style="{ paddingLeft: `${12 + props.depth * 18}px` }"
          :class="{ 'post-explorer__row--leaf': !hasChildren(n) }"
          @click="onDirRowClick(n)"
        >
          <span
            v-if="hasChildren(n)"
            class="post-explorer__caret"
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
          <span v-else class="post-explorer__caret post-explorer__caret--spacer" aria-hidden="true" />

          <el-icon class="post-explorer__folder" :size="16"><Folder /></el-icon>
          <span class="post-explorer__name">{{ n.name }}</span>
          <code class="post-explorer__slug">{{ n.slug }}</code>
        </div>

        <PostExplorerTree
          v-if="hasChildren(n) && isOpen(n.id)"
          :nodes="n.children"
          :depth="props.depth + 1"
        />
      </li>

      <li v-else class="post-explorer__item" role="treeitem">
        <NuxtLink
          class="post-explorer__row post-explorer__row--post"
          :style="{ paddingLeft: `${12 + props.depth * 18}px` }"
          :to="`/admin/posts/${encodeURIComponent(n.slug)}`"
        >
          <span class="post-explorer__caret post-explorer__caret--spacer" aria-hidden="true" />
          <el-icon class="post-explorer__doc" :size="16"><Document /></el-icon>
          <span class="post-explorer__name post-explorer__name--link">{{ n.title }}</span>
          <code class="post-explorer__slug">{{ n.slug }}.md</code>
          <el-tag size="small" :type="statusTagType(n.status)" effect="plain" class="post-explorer__status">
            {{ statusLabel(n.status) }}
          </el-tag>
        </NuxtLink>
      </li>
    </template>
  </ul>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.post-explorer {
  list-style: none;
  margin: 0;
  padding: 0;
}

.post-explorer--root {
  border: 1px solid var(--admin-border);
  border-radius: @radius-lg;
  overflow: hidden;
  background: var(--admin-toolbar-bg);
}

.post-explorer__item {
  margin: 0;
}

.post-explorer__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding-right: 12px;
  user-select: none;
  border-bottom: 1px solid var(--admin-border);
  color: var(--admin-text);
  transition: background @transition-fast;
}

.post-explorer__row--dir {
  cursor: default;
}

.post-explorer__row--dir:hover {
  background: var(--admin-nav-hover);
}

.post-explorer__row--post {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.post-explorer__row--post:hover {
  background: var(--admin-nav-hover);
}

.post-explorer__caret {
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

.post-explorer__caret:hover {
  color: var(--admin-text);
  background: var(--admin-nav-hover);
}

.post-explorer__caret--spacer {
  cursor: default;
  pointer-events: none;
  opacity: 0.35;
}

.post-explorer__folder {
  flex-shrink: 0;
  color: #c9a227;
}

.post-explorer__doc {
  flex-shrink: 0;
  color: var(--el-color-primary);
}

.post-explorer__name {
  font-weight: 600;
  font-size: 14px;
  min-width: 0;
  flex: 1;
}

.post-explorer__name--link {
  font-weight: 500;
}

.post-explorer__slug {
  flex-shrink: 0;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: @radius-sm;
  background: var(--admin-nav-hover);
  border: 1px solid var(--admin-border);
  color: var(--admin-muted);
}

.post-explorer__status {
  flex-shrink: 0;
  margin-left: 4px;
}
</style>
