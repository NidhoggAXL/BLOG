<script setup lang="ts">
import {
  Delete,
  EditPen,
  FolderAdd,
  MoreFilled,
  Plus,
  Refresh,
  Search,
  View,
} from "@element-plus/icons-vue";
import DirectoryManageDialog from "~/components/DirectoryManageDialog.vue";
import {
  buildDirectoryRowTree,
  type DirectoryRowTree,
} from "~/composables/buildDirectoryTreeSelect";
import type { DirectoryRow } from "~/types/directory";
import type { PostListItem } from "~/types/post";
import { confirmDestructive } from "~/utils/confirmDialog";
import {
  collectDescendantIds,
  countPostsInSubtree,
} from "~/utils/libraryDirectory";
import { compareObsidianSortOrder } from "~/utils/sortOrder";

const props = defineProps<{
  directories: DirectoryRow[];
  posts: PostListItem[];
  loading?: boolean;
  fetchError?: string | null;
  /** 打开时展开并定位的目录 id */
  focusDirectoryId?: number | null;
}>();

const emit = defineEmits<{
  success: [];
  browse: [directoryId: number];
  refresh: [];
}>();

const postCache = usePostCacheStore();
const filterQuery = ref("");
const manageOpen = ref(false);
const editingRow = ref<DirectoryRow | null>(null);
const createParentId = ref(0);
const deletingAll = ref(false);
const treeRenderKey = ref(0);
const expandedKeys = ref<number[]>([]);

const treeProps = {
  children: "children",
  label: "name",
};

const stats = computed(() => {
  const dirs = props.directories;
  const branchIds = new Set(
    dirs
      .map((d) => d.parent_id)
      .filter((id): id is number => id != null),
  );
  return {
    total: dirs.length,
    roots: dirs.filter((d) => d.parent_id == null).length,
    leaves: dirs.filter((d) => !branchIds.has(d.id)).length,
    posts: props.posts.filter((p) => p.directory_id != null).length,
  };
});

const rootDirectories = computed(() =>
  props.directories.filter((r) => r.parent_id == null),
);

function sortTreeNodes(nodes: DirectoryRowTree[]) {
  nodes.sort(
    (a, b) =>
      compareObsidianSortOrder(a.sort_order, b.sort_order) || a.id - b.id,
  );
  for (const node of nodes) {
    if (node.children?.length) sortTreeNodes(node.children);
  }
}

function filterDirectoryTree(
  nodes: DirectoryRowTree[],
  query: string,
): DirectoryRowTree[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const out: DirectoryRowTree[] = [];
  for (const node of nodes) {
    const children = node.children?.length
      ? filterDirectoryTree(node.children, q)
      : [];
    const selfMatch =
      node.name.toLowerCase().includes(q) ||
      node.slug.toLowerCase().includes(q);
    if (selfMatch || children.length) {
      out.push({
        ...node,
        children: children.length ? children : undefined,
      });
    }
  }
  return out;
}

const treeDataFull = computed(() => {
  const roots = buildDirectoryRowTree(props.directories);
  sortTreeNodes(roots);
  return roots;
});

const treeData = computed(() =>
  filterDirectoryTree(treeDataFull.value, filterQuery.value),
);

const searchActive = computed(() => Boolean(filterQuery.value.trim()));

watch(manageOpen, (open) => {
  if (!open) {
    editingRow.value = null;
    createParentId.value = 0;
  }
});

function refreshTree(expandIds?: number[]) {
  if (expandIds) {
    expandedKeys.value = [...new Set(expandIds)];
  }
  treeRenderKey.value += 1;
}

function collectAncestorIds(
  id: number,
  flat: DirectoryRow[],
): number[] {
  const ids: number[] = [];
  let current = flat.find((d) => d.id === id);
  while (current?.parent_id != null) {
    ids.push(current.parent_id);
    current = flat.find((d) => d.id === current!.parent_id);
  }
  return ids;
}

function applyFocus(focus: number | null | undefined) {
  if (focus == null || focus <= 0) return;
  if (!props.directories.some((d) => d.id === focus)) return;
  const ancestors = collectAncestorIds(focus, props.directories);
  expandedKeys.value = [...new Set([...expandedKeys.value, ...ancestors, focus])];
  refreshTree(expandedKeys.value);
}

watch(
  () => props.directories.length,
  (len) => {
    if (len === 0 || expandedKeys.value.length > 0 || props.focusDirectoryId) return;
    expandedKeys.value = props.directories
      .filter((d) => d.parent_id == null)
      .map((d) => d.id);
    refreshTree(expandedKeys.value);
  },
  { immediate: true },
);

watch(
  () => [props.directories.length, props.focusDirectoryId] as const,
  () => applyFocus(props.focusDirectoryId),
  { immediate: true },
);

watch(filterQuery, (q) => {
  if (!q.trim()) return;
  expandedKeys.value = props.directories.map((d) => d.id);
  refreshTree(expandedKeys.value);
});

function expandAll() {
  refreshTree(props.directories.map((d) => d.id));
}

function collapseAll() {
  refreshTree([]);
}

function handleNodeExpand(data: DirectoryRowTree) {
  if (!expandedKeys.value.includes(data.id)) {
    expandedKeys.value = [...expandedKeys.value, data.id];
  }
}

function handleNodeCollapse(data: DirectoryRowTree) {
  const removeIds = collectDescendantIds(data.id, props.directories);
  expandedKeys.value = expandedKeys.value.filter(
    (id) => id !== data.id && !removeIds.has(id),
  );
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

function childDirCount(dirId: number) {
  return props.directories.filter((r) => r.parent_id === dirId).length;
}

function childPostCount(dirId: number) {
  return countPostsInSubtree(dirId, props.posts, props.directories);
}

function sortLabel(row: DirectoryRowTree) {
  return row.sort_order == null ? null : `排序 ${row.sort_order}`;
}

function nodeMetaLine(row: DirectoryRowTree) {
  const parts: string[] = [row.slug];
  const sort = sortLabel(row);
  if (sort) parts.push(sort);
  const dirs = childDirCount(row.id);
  const posts = childPostCount(row.id);
  if (dirs > 0) parts.push(`${dirs} 个子目录`);
  if (posts > 0) parts.push(`${posts} 篇文章`);
  return parts.join(" · ");
}

type NodeMenuCommand = "edit" | "browse" | "delete";

function onNodeMenu(command: NodeMenuCommand, row: DirectoryRowTree) {
  if (command === "edit") openEdit(row);
  else if (command === "browse") browseDirectory(row.id);
  else onDeleteDirectory(row);
}

function onManageSuccess() {
  manageOpen.value = false;
  emit("success");
}

function browseDirectory(id: number) {
  emit("browse", id);
}

async function onDeleteAllDirectories() {
  const roots = rootDirectories.value;
  if (!roots.length) return;

  const dirCount = props.directories.length;
  const postCount = stats.value.posts;
  const message =
    postCount > 0
      ? `将永久删除全部 ${dirCount} 个目录节点及 ${postCount} 篇目录内文章，确定继续？`
      : `将永久删除全部 ${dirCount} 个目录节点，确定继续？`;

  await nextTick();
  try {
    await confirmDestructive(message, "删除全部目录");
  } catch {
    return;
  }

  deletingAll.value = true;
  let totalDirsRemoved = 0;
  let totalPostsDeleted = 0;
  const deletedSlugs: string[] = [];

  try {
    for (const root of roots) {
      const res = await $fetch<{
        posts_deleted: number;
        directories_removed: number;
        deleted_post_slugs?: string[];
      }>(`/api/directories/${root.id}`, { method: "DELETE" });
      totalDirsRemoved += res.directories_removed;
      totalPostsDeleted += res.posts_deleted;
      deletedSlugs.push(...(res.deleted_post_slugs ?? []));
    }
    for (const slug of deletedSlugs) {
      postCache.removeDetail(slug);
    }
    expandedKeys.value = [];
    refreshTree([]);
    ElMessage.success(
      totalPostsDeleted > 0
        ? `已删除全部目录（${totalDirsRemoved} 个节点、${totalPostsDeleted} 篇文章）`
        : `已删除全部目录（${totalDirsRemoved} 个节点）`,
    );
    emit("success");
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string };
    ElMessage.error(err?.data?.statusMessage || err?.message || "删除失败");
    emit("success");
  } finally {
    deletingAll.value = false;
  }
}

async function onDeleteDirectory(row: DirectoryRow) {
  const hasSub = childDirCount(row.id) > 0;
  const postCount = childPostCount(row.id);
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
    const removeIds = collectDescendantIds(row.id, props.directories);
    expandedKeys.value = expandedKeys.value.filter((id) => !removeIds.has(id));
    refreshTree(expandedKeys.value);
    ElMessage.success(
      res.posts_deleted > 0
        ? `已删除 ${res.directories_removed} 个目录节点及 ${res.posts_deleted} 篇文章`
        : `已删除 ${res.directories_removed} 个目录节点`,
    );
    emit("success");
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string };
    ElMessage.error(err?.data?.statusMessage || err?.message || "删除失败");
  }
}
</script>

<template>
  <div v-loading="loading" class="admin-directories-page">
    <section class="admin-card admin-card--pad admin-directories-page__hero">
      <div class="admin-directories-page__hero-main">
        <h1 class="admin-directories-page__title">目录结构</h1>
        <p class="admin-directories-page__desc">
          维护博客目录树，与前台侧栏展示一致。可在树节点上直接新建、编辑或删除目录；删除目录会同步删除其下文章。
        </p>
      </div>

      <div class="admin-directories-page__hero-actions">
        <el-button type="primary" :icon="FolderAdd" @click="openCreate(0)">
          新建目录
        </el-button>
        <el-button :disabled="!directories.length" @click="expandAll">
          全部展开
        </el-button>
        <el-button :disabled="!directories.length" @click="collapseAll">
          全部折叠
        </el-button>
        <el-button :icon="Refresh" :loading="loading" @click="emit('refresh')">
          刷新
        </el-button>
        <el-button
          v-if="directories.length"
          type="danger"
          plain
          :icon="Delete"
          :loading="deletingAll"
          @click="onDeleteAllDirectories"
        >
          删除全部
        </el-button>
      </div>
    </section>

    <el-alert
      v-if="fetchError"
      type="error"
      :closable="false"
      :title="fetchError"
      class="admin-directories-page__alert"
    />

    <template v-else>
      <section class="admin-directories-page__stats" aria-label="目录统计">
        <div class="admin-directories-page__stat-card">
          <span class="admin-directories-page__stat-label">目录总数</span>
          <strong class="admin-directories-page__stat-value">{{ stats.total }}</strong>
        </div>
        <div class="admin-directories-page__stat-card">
          <span class="admin-directories-page__stat-label">一级目录</span>
          <strong class="admin-directories-page__stat-value">{{ stats.roots }}</strong>
        </div>
        <div class="admin-directories-page__stat-card">
          <span class="admin-directories-page__stat-label">叶子节点</span>
          <strong class="admin-directories-page__stat-value">{{ stats.leaves }}</strong>
        </div>
      </section>

      <section class="admin-card admin-card--pad admin-directories-page__tree-card">
        <div class="admin-directories-page__tree-head">
          <div class="admin-directories-page__tree-head-main">
            <h2 class="admin-directories-page__tree-title">目录树</h2>
            <p class="admin-directories-page__tree-subtitle">
              点击左侧箭头展开或折叠子目录；节点右侧可直接操作。
              <NuxtLink to="/admin/posts">去文章列表</NuxtLink>
            </p>
          </div>

          <div class="admin-directories-page__tree-tools">
            <el-input
              v-model="filterQuery"
              clearable
              placeholder="搜索目录名称或 slug"
              class="admin-directories-page__search"
              :prefix-icon="Search"
            />
          </div>
        </div>

        <div class="admin-directories-page__tree-body">
          <div v-if="!directories.length" class="admin-directories-page__empty">
            <el-empty description="还没有任何目录" :image-size="88">
              <el-button type="primary" :icon="FolderAdd" @click="openCreate(0)">
                新建第一个目录
              </el-button>
            </el-empty>
          </div>

          <p
            v-else-if="searchActive && !treeData.length"
            class="admin-directories-page__tree-subtitle"
          >
            无匹配的目录。
          </p>

          <el-tree
            v-else
            :key="treeRenderKey"
            :data="treeData"
            node-key="id"
            :props="treeProps"
            :expand-on-click-node="false"
            :default-expanded-keys="expandedKeys"
            class="admin-directories-page__tree"
            @node-expand="handleNodeExpand"
            @node-collapse="handleNodeCollapse"
          >
            <template #default="{ data }">
              <div class="admin-directories-page__tree-node">
                <div class="admin-directories-page__tree-node-main">
                  <span class="admin-directories-page__tree-node-name">{{ data.name }}</span>
                  <span class="admin-directories-page__tree-node-meta">{{ nodeMetaLine(data) }}</span>
                </div>

                <div class="admin-directories-page__tree-node-actions">
                  <el-button
                    size="small"
                    text
                    :icon="Plus"
                    @click.stop="openCreate(data.id)"
                  >
                    子目录
                  </el-button>
                  <el-dropdown
                    trigger="click"
                    @command="(cmd: NodeMenuCommand) => onNodeMenu(cmd, data)"
                  >
                    <el-button size="small" text :icon="MoreFilled" @click.stop />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="edit" :icon="EditPen">
                          编辑
                        </el-dropdown-item>
                        <el-dropdown-item command="browse" :icon="View">
                          查看文章
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" :icon="Delete" divided>
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </template>
          </el-tree>
        </div>
      </section>
    </template>

    <DirectoryManageDialog
      v-model="manageOpen"
      :editing="editingRow"
      :default-parent-id="createParentId"
      @success="onManageSuccess"
    />
  </div>
</template>
