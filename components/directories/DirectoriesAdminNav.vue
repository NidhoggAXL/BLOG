<script setup lang="ts">
import {
  CaretBottom,
  CaretRight,
  Files,
  Folder,
} from "@element-plus/icons-vue";
import type { DirectoriesAdminNavNode } from "~/utils/directoriesAdminNav";

defineOptions({ name: "DirectoriesAdminNav" });

defineProps<{
  nodes: DirectoriesAdminNavNode[];
  selectedId: number | null;
  depth?: number;
}>();

const emit = defineEmits<{
  select: [id: number];
}>();

const expandedMap = inject<Record<number, boolean>>("libraryDirExpanded")!;

function hasChildren(n: DirectoriesAdminNavNode) {
  return n.children.length > 0;
}

function isOpen(id: number) {
  return expandedMap[id] === true;
}

function onToggle(id: number) {
  expandedMap[id] = !isOpen(id);
}

function nodeIcon(n: DirectoriesAdminNavNode) {
  if (n.kind === "all") return Files;
  return Folder;
}
</script>

<template>
  <ul
    class="admin-tree-nav"
    :class="{ 'admin-tree-nav--root': (depth ?? 0) === 0 }"
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
          'admin-tree-nav__row--virtual': n.kind === 'all',
        }"
        :style="{ paddingLeft: `${4 + (depth ?? 0) * 16}px` }"
      >
        <span
          v-if="hasChildren(n)"
          class="admin-tree-nav__caret"
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
          <span
            v-if="n.kind === 'all' ? (n.directoryCount ?? 0) > 0 : n.postCount > 0"
            class="admin-tree-nav__badge"
          >
            {{ n.kind === "all" ? n.directoryCount : n.postCount }}
          </span>
        </button>
      </div>

      <DirectoriesAdminNav
        v-if="hasChildren(n) && isOpen(n.id)"
        :nodes="n.children"
        :selected-id="selectedId"
        :depth="(depth ?? 0) + 1"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>
