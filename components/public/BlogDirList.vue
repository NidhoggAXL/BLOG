<script setup lang="ts">
import type { TreeNode } from '~/types/blog'

defineProps<{
  nodes: TreeNode[]
  activeSlug?: string
  enableInlineExpand?: boolean
  isExpanded: (id: string) => boolean
  folderHasSubfolders: (node: TreeNode) => boolean
}>()

const emit = defineEmits<{
  enter: [id: string]
  toggleExpand: [id: string]
}>()
</script>

<template>
  <ul class="dir-list">
    <template v-for="node in nodes" :key="node.id">
      <li v-if="node.type === 'folder'" class="dir-item">
        <div class="dir-row folder-row">
          <button
            v-if="enableInlineExpand && folderHasSubfolders(node)"
            type="button"
            class="tree-chevron-btn"
            :class="{ expanded: isExpanded(node.id) }"
            :title="isExpanded(node.id) ? '折叠' : '展开'"
            @click.stop="emit('toggleExpand', node.id)"
          >
            ›
          </button>
          <span v-else class="tree-chevron-spacer" />
          <button
            type="button"
            class="dir-label folder-label"
            @click="emit('enter', node.id)"
          >
            <span class="dir-icon" aria-hidden="true">{{ isExpanded(node.id) ? '📂' : '📁' }}</span>
            {{ node.name }}
          </button>
        </div>
        <BlogDirList
          v-if="enableInlineExpand && folderHasSubfolders(node) && isExpanded(node.id) && node.children"
          :nodes="node.children"
          :active-slug="activeSlug"
          :enable-inline-expand="enableInlineExpand"
          :is-expanded="isExpanded"
          :folder-has-subfolders="folderHasSubfolders"
          class="dir-children"
          @enter="emit('enter', $event)"
          @toggle-expand="emit('toggleExpand', $event)"
        />
      </li>
      <li v-else class="dir-item">
        <NuxtLink
          :to="`/blog/${node.slug}`"
          class="dir-row file-row"
          :class="{ active: activeSlug === node.slug }"
        >
          <span class="tree-chevron-spacer" />
          <span class="dir-icon" aria-hidden="true">📝</span>
          <span class="dir-label">{{ node.name }}</span>
        </NuxtLink>
      </li>
    </template>
  </ul>
</template>

<style scoped lang="less">
@import '~/assets/less/_tokens.less';

.dir-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dir-children {
  padding-left: 0.45rem;
  margin-left: 0.25rem;
  border-left: 1px solid var(--border);
}

.dir-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.55rem 0.6rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9375rem;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  text-decoration: none;

  &:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  &.active {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 500;
  }
}

.folder-row {
  padding: 0;
}

.folder-label {
  flex: 1;
  min-width: 0;
  padding: 0.55rem 0.6rem 0.55rem 0;
  border: none;
  background: transparent;
  color: var(--text);
  font-weight: 500;
  font-size: 0.9375rem;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;

  &:hover {
    color: var(--accent);
  }
}

.tree-chevron-btn {
  flex-shrink: 0;
  width: 1.35rem;
  height: 1.35rem;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.15s, color 0.12s, background 0.12s;

  &:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  &.expanded {
    transform: rotate(90deg);
  }
}

.tree-chevron-spacer {
  width: 1.35rem;
  flex-shrink: 0;
}

.dir-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dir-icon {
  flex-shrink: 0;
  width: 1.15rem;
  text-align: center;
  font-size: 0.95rem;
}

.file-row {
  display: flex;
}
</style>
