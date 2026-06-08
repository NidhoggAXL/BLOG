<script setup lang="ts">
import {
  Delete,
  Edit,
  EditPen,
  Expand,
  Fold,
  FolderAdd,
  Plus,
  View,
} from "@element-plus/icons-vue";
import DirectoryManageDialog from "~/components/DirectoryManageDialog.vue";
import LibraryDirectoryNav from "~/components/library/LibraryDirectoryNav.vue";
import { buildDirectoryRowTree } from "~/composables/buildDirectoryTreeSelect";
import type { DirectoryRow } from "~/types/directory";
import type { PostListItem } from "~/types/post";
import { confirmDestructive } from "~/utils/confirmDialog";
import {
  buildLibraryNavTree,
  countPostsInSubtree,
  expandLibraryAncestors,
  filterLibraryNavTree,
  findLibraryNavNode,
  firstLibraryNavNode,
  getChildDirectories,
  type LibraryNavNode,
} from "~/utils/libraryDirectory";

const props = defineProps<{
  directories: DirectoryRow[];
  posts: PostListItem[];
  loading?: boolean;
  /** 打开时预选目录 id */
  focusDirectoryId?: number | null;
}>();

const filterQuery = defineModel<string>("filterQuery", { default: "" });

const emit = defineEmits<{
  success: [];
  browse: [directoryId: number];
}>();

const postCache = usePostCacheStore();
const selectedDirectoryId = ref<number | null>(null);
const manageOpen = ref(false);
const editingRow = ref<DirectoryRow | null>(null);
const createParentId = ref(0);
const COL_MIN_WIDTH = 140;

const dirExpanded = reactive<Record<number, boolean>>({});
provide("libraryDirExpanded", dirExpanded);

const treeData = computed(() => buildDirectoryRowTree(props.directories));
const navTreeFull = computed(() =>
  buildLibraryNavTree(treeData.value, props.posts, props.directories),
);
const navTree = computed(() =>
  filterLibraryNavTree(navTreeFull.value, filterQuery.value),
);

const searchActive = computed(() => Boolean(filterQuery.value.trim()));

const selectedDir = computed(() => {
  if (selectedDirectoryId.value == null) return null;
  return findLibraryNavNode(navTreeFull.value, selectedDirectoryId.value);
});

const selectedRow = computed(() => {
  if (selectedDirectoryId.value == null) return null;
  return props.directories.find((r) => r.id === selectedDirectoryId.value) ?? null;
});

const childDirectories = computed(() => {
  if (selectedDirectoryId.value == null) return [];
  return getChildDirectories(selectedDirectoryId.value, props.directories);
});

const subtreePostCount = computed(() => {
  if (selectedDirectoryId.value == null) return 0;
  return countPostsInSubtree(
    selectedDirectoryId.value,
    props.posts,
    props.directories,
  );
});

watch(manageOpen, (open) => {
  if (!open) {
    editingRow.value = null;
    createParentId.value = 0;
  }
});

function applyFocus(focus: number | null | undefined) {
  const id =
    focus != null && focus > 0 && findLibraryNavNode(navTreeFull.value, focus)
      ? focus
      : null;
  if (id != null) {
    selectDirectory(id);
    return;
  }
  const first = firstLibraryNavNode(navTreeFull.value);
  selectedDirectoryId.value = first?.id ?? null;
  if (first) {
    expandLibraryAncestors(navTreeFull.value, first.id, (dirId, open) => {
      dirExpanded[dirId] = open;
    });
  }
}

watch(
  () => [props.directories.length, props.focusDirectoryId] as const,
  () => applyFocus(props.focusDirectoryId),
  { immediate: true },
);

watch(filterQuery, (q) => {
  if (!q.trim()) return;
  const walk = (nodes: LibraryNavNode[]) => {
    for (const n of nodes) {
      if (n.children.length) {
        dirExpanded[n.id] = true;
        walk(n.children);
      }
    }
  };
  walk(navTree.value);
});

function selectDirectory(id: number) {
  selectedDirectoryId.value = id;
  expandLibraryAncestors(navTreeFull.value, id, (dirId, open) => {
    dirExpanded[dirId] = open;
  });
}

function walkSetExpanded(nodes: LibraryNavNode[], value: boolean) {
  for (const n of nodes) {
    if (n.children.length) {
      dirExpanded[n.id] = value;
      walkSetExpanded(n.children, value);
    }
  }
}

function expandAll() {
  walkSetExpanded(navTreeFull.value, true);
}

function collapseAll() {
  walkSetExpanded(navTreeFull.value, false);
}

function openCreate(parentId = 0) {
  editingRow.value = null;
  createParentId.value = parentId;
  manageOpen.value = true;
}

function openEdit(row: DirectoryRow) {
  editingRow.value = { ...row };
  createParentId.value = 0;
  manageOpen.value = true;
}

defineExpose({ openCreate });

function hasDirChildren(id: number) {
  return props.directories.some((r) => r.parent_id === id);
}

function onManageSuccess() {
  manageOpen.value = false;
  emit("success");
}

function browseInList() {
  if (selectedDirectoryId.value == null) return;
  emit("browse", selectedDirectoryId.value);
}

function childPostCount(dirId: number) {
  return countPostsInSubtree(dirId, props.posts, props.directories);
}

function onChildRowClick(row: DirectoryRow, column: { type?: string; label?: string }) {
  if (column?.label === "操作") return;
  selectDirectory(row.id);
}

function openChildEdit(row: DirectoryRow, ev: Event) {
  ev.stopPropagation();
  openEdit(row);
}

function openChildDelete(row: DirectoryRow, ev: Event) {
  ev.stopPropagation();
  void onDeleteDirectory(row);
}

async function onDeleteDirectory(row: DirectoryRow) {
  const hasSub = hasDirChildren(row.id);
  const postCount = countPostsInSubtree(row.id, props.posts, props.directories);
  const message = hasSub
    ? `将永久删除「${row.name}」及其所有子目录（含 ${postCount} 篇文章），确定继续？`
    : postCount > 0
      ? `将永久删除「${row.name}」及其下 ${postCount} 篇文章，确定继续？`
      : `确定删除「${row.name}」？`;
  await nextTick();
  try {
    await confirmDestructive(message, "删除确认");
  } catch {
    return;
  }
  try {
    const res = await $fetch<{
      posts_deleted: number;
      directories_removed: number;
      deleted_post_slugs?: string[];
    }>(`/api/directories/${row.id}`, { method: "DELETE" });
    for (const slug of res.deleted_post_slugs ?? []) {
      postCache.removeDetail(slug);
    }
    ElMessage.success(
      res.posts_deleted > 0
        ? `已删除 ${res.directories_removed} 个目录节点及 ${res.posts_deleted} 篇文章`
        : `已删除 ${res.directories_removed} 个目录节点`,
    );
    if (selectedDirectoryId.value === row.id) {
      selectedDirectoryId.value = null;
    }
    emit("success");
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string };
    ElMessage.error(err?.data?.statusMessage || err?.message || "删除失败");
  }
}
</script>

<template>
  <template v-if="!directories.length">
    <section class="admin-card admin-card--pad admin-module-page__empty">
      <el-empty description="还没有任何目录" :image-size="88">
        <el-button type="primary" :icon="FolderAdd" @click="openCreate(0)">
          新建第一个目录
        </el-button>
      </el-empty>
    </section>
  </template>

  <div v-else v-loading="loading" class="admin-module-page__split">
    <aside class="admin-card admin-card--pad admin-module-page__nav" aria-label="目录树">
      <div v-if="navTreeFull.length" class="admin-module-page__nav-head">
        <span class="admin-module-page__nav-label">
          {{ searchActive ? "匹配目录" : "目录树" }}
        </span>
        <div class="admin-module-page__nav-actions">
          <el-button size="small" text :icon="Expand" @click="expandAll">
            展开
          </el-button>
          <el-button size="small" text :icon="Fold" @click="collapseAll">
            折叠
          </el-button>
        </div>
      </div>

      <p
        v-if="searchActive && !navTree.length"
        class="admin-module-page__nav-empty"
      >
        无匹配的目录。
      </p>

      <div v-else-if="navTree.length" class="admin-module-page__nav-tree">
        <LibraryDirectoryNav
          :nodes="navTree"
          :selected-id="selectedDirectoryId"
          @select="selectDirectory"
        />
      </div>

      <NuxtLink
        to="/admin/posts"
        class="admin-module-page__nav-footer-link"
      >
        去文章列表…
      </NuxtLink>
    </aside>

    <section class="admin-card admin-card--pad admin-module-page__list">
      <template v-if="selectedDir">
        <div class="admin-module-page__list-head">
          <h2 class="admin-module-page__list-title">{{ selectedDir.name }}</h2>
          <p class="admin-module-page__list-path">{{ selectedDir.pathLabel }}</p>
          <div class="admin-module-page__list-tags">
            <code class="admin-module-page__list-slug">{{ selectedDir.slug }}</code>
            <el-tag size="small" type="info">
              本层 {{ selectedDir.directPostCount }} 篇
            </el-tag>
            <el-tag size="small">含子级 {{ subtreePostCount }} 篇</el-tag>
          </div>
        </div>

        <div class="admin-module-page__list-actions">
          <el-button type="primary" plain :icon="Plus" @click="openCreate(selectedDir.id)">
            子目录
          </el-button>
          <el-button
            v-if="selectedRow"
            plain
            :icon="EditPen"
            @click="openEdit(selectedRow)"
          >
            编辑
          </el-button>
          <el-button plain :icon="View" @click="browseInList">
            查看文章
          </el-button>
          <el-button
            v-if="selectedRow"
            type="danger"
            plain
            :icon="Delete"
            @click="onDeleteDirectory(selectedRow)"
          >
            删除
          </el-button>
        </div>

        <template v-if="childDirectories.length">
          <h3 class="admin-module-page__section-title">子目录</h3>
          <div class="admin-module-page__table-wrap">
            <div class="admin-data-table-wrap admin-data-table-wrap--auto">
              <el-table
                :data="childDirectories"
                class="admin-data-table admin-data-table--clickable"
                stripe
                table-layout="auto"
                row-key="id"
                empty-text="暂无子目录"
                @row-click="onChildRowClick"
              >
                <el-table-column
                  prop="name"
                  label="名称"
                  :min-width="COL_MIN_WIDTH"
                  align="left"
                  header-align="left"
                  class-name="admin-data-table__col-left admin-data-table__col-left--indent"
                  label-class-name="admin-data-table__col-left admin-data-table__col-left--indent"
                >
                  <template #default="{ row }">
                    <span class="admin-data-table__name">{{ row.name }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="slug"
                  label="slug"
                  :min-width="COL_MIN_WIDTH"
                  align="center"
                  header-align="center"
                >
                  <template #default="{ row }">
                    <code class="admin-data-table__slug">{{ row.slug }}</code>
                  </template>
                </el-table-column>
                <el-table-column
                  label="文章数"
                  :min-width="100"
                  align="center"
                  header-align="center"
                >
                  <template #default="{ row }">
                    <span class="admin-data-table__muted">{{ childPostCount(row.id) }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  label="操作"
                  width="120"
                  align="center"
                  header-align="center"
                  fixed="right"
                >
                  <template #default="{ row }">
                    <div class="admin-data-table__actions">
                      <el-button type="primary" link :icon="Edit" @click="openChildEdit(row, $event)">
                        编辑
                      </el-button>
                      <el-button type="danger" link :icon="Delete" @click="openChildDelete(row, $event)">
                        删除
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </template>
      </template>

      <div v-else class="admin-module-page__empty">
        <el-empty
          description="在左侧选择一个目录，或新建顶级目录"
          :image-size="72"
        />
      </div>
    </section>
  </div>

  <DirectoryManageDialog
    v-model="manageOpen"
    :editing="editingRow"
    :default-parent-id="createParentId"
    @success="onManageSuccess"
  />
</template>
