<script setup lang="ts">
import {
  CaretBottom,
  CaretRight,
  Folder,
  FolderOpened,
} from "@element-plus/icons-vue";
import type { PostsAdminNavNode } from "~/utils/postsAdminNav";

defineOptions({ name: "PostsAdminNav" });

const props = withDefaults(
  defineProps<{
    nodes: PostsAdminNavNode[];
    selectedId: number | null;
    depth?: number;
    /** 嵌入侧栏大卡片内，不额外套一层边框/圆角 */
    flat?: boolean;
  }>(),
  { flat: false },
);

const emit = defineEmits<{
  select: [id: number];
}>();

const expandedMap = inject<Record<number, boolean>>("postsDirExpanded")!;

function hasChildren(n: PostsAdminNavNode) {
  return n.children.length > 0;
}

function isOpen(id: number) {
  return expandedMap[id] === true;
}

function onToggle(id: number) {
  expandedMap[id] = !isOpen(id);
}

function nodeIcon(n: PostsAdminNavNode) {
  if (n.kind === "uncategorized") return FolderOpened;
  return Folder;
}
</script>

<template>
  <ul
    class="admin-tree-nav"
    :class="{
      'admin-tree-nav--root': (depth ?? 0) === 0 && !flat,
      'admin-tree-nav--flat': (depth ?? 0) === 0 && flat,
    }"
    role="tree"
  >
    <li
      v-for="n in nodes"
      :key="n.id"
      class="admin-tree-nav__item"
      role="treeitem"
      :aria-expanded="hasChildren(n) ? isOpen(n.id) : undefined"
    >
      <div
        class="admin-tree-nav__row"
        :class="{
          'admin-tree-nav__row--active': selectedId === n.id,
          'admin-tree-nav__row--virtual': n.kind === 'uncategorized',
        }"
        :style="{ paddingLeft: `${4 + (depth ?? 0) * 16}px` }"
      >
        <span
          v-if="hasChildren(n)"
          class="admin-tree-nav__caret"
          role="button"
          tabindex="0"
          @click.stop="onToggle(n.id)"
          @keydown.enter.prevent="onToggle(n.id)"
          @keydown.space.prevent="onToggle(n.id)"
        >
          <el-icon :size="14">
            <CaretBottom v-if="isOpen(n.id)" />
            <CaretRight v-else />
          </el-icon>
        </span>
        <span v-else class="admin-tree-nav__caret admin-tree-nav__caret--spacer" aria-hidden="true" />

        <button
          type="button"
          class="admin-tree-nav__body"
          :aria-selected="selectedId === n.id"
          @click="emit('select', n.id)"
        >
          <el-icon class="admin-tree-nav__icon" :size="16">
            <component :is="nodeIcon(n)" />
          </el-icon>
          <span class="admin-tree-nav__name">{{ n.name }}</span>
          <span v-if="n.postCount > 0" class="admin-tree-nav__badge">{{ n.postCount }}</span>
        </button>
      </div>

      <PostsAdminNav
        v-if="hasChildren(n) && isOpen(n.id)"
        :nodes="n.children"
        :selected-id="selectedId"
        :depth="(depth ?? 0) + 1"
        :flat="flat"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>
