<script setup lang="ts">
import {
  DocumentAdd,
  Expand,
  Fold,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import PostBatchDeleteDialog from "~/components/posts/PostBatchDeleteDialog.vue";
import type { BatchDeleteRequest } from "~/components/posts/PostBatchDeleteDialog.vue";
import PostsAdminNav from "~/components/posts/PostsAdminNav.vue";
import PostsBatchToolbar from "~/components/posts/PostsBatchToolbar.vue";
import PostDirectoryPostTable from "~/components/posts/PostDirectoryPostTable.vue";
import { buildDirectoryRowTree } from "~/composables/buildDirectoryTreeSelect";
import type { DirectoryRow } from "~/types/directory";
import type { PostBatchStatusResult, PostListItem } from "~/types/post";
import {
  attachDirectoryPaths,
  buildDirectoryPathLabelMap,
  collectNavNodeIds,
  filterPostsByQuery,
  filterPostsByStatus,
  isSearchActive,
  type PostStatusFilter,
} from "~/utils/postSearch";
import { expandLibraryAncestors } from "~/utils/libraryDirectory";
import {
  ALL_POSTS_NAV_ID,
  buildPostsAdminNavTree,
  filterPostsAdminNavTree,
  findPostsAdminNavNode,
  firstPostsAdminNavNode,
  isRealDirectoryNavId,
  postsForNavSelection,
  subtreeCountForNav,
  type PostsAdminNavNode,
} from "~/utils/postsAdminNav";

definePageMeta({
  layout: "admin",
});

const STATUS_OPTIONS: { value: PostStatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已归档" },
];

const BATCH_STATUS_TARGETS: { value: PostListItem["status"]; label: string }[] = [
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已归档" },
];

const dirList = ref<DirectoryRow[]>([]);
const postsList = ref<PostListItem[]>([]);
const loading = ref(false);
const fetchError = ref<string | null>(null);
const filterQuery = ref("");
const statusFilter = ref<PostStatusFilter>("all");
const selectedDirectoryId = ref<number>(ALL_POSTS_NAV_ID);
const tableSelection = ref<PostListItem[]>([]);
const tableRef = ref<InstanceType<typeof PostDirectoryPostTable> | null>(null);
const batchDeleteOpen = ref(false);
const batchDeleteRequest = ref<BatchDeleteRequest | null>(null);
const batchTargetStatus = ref<PostListItem["status"]>("published");
const batchStatusLoading = ref(false);
const postCache = usePostCacheStore();
const route = useRoute();
const dirExpanded = reactive<Record<number, boolean>>({});
provide("postsDirExpanded", dirExpanded);

const postsByStatus = computed(() =>
  filterPostsByStatus(postsList.value, statusFilter.value),
);

const treeData = computed(() => buildDirectoryRowTree(dirList.value));
const navTreeFull = computed(() =>
  buildPostsAdminNavTree(dirList.value, postsByStatus.value),
);
const directoryPathMap = computed(() => buildDirectoryPathLabelMap(treeData.value));

const searchActive = computed(() => isSearchActive(filterQuery.value));

const displayNavTree = computed(() => {
  if (!searchActive.value) return navTreeFull.value;
  const filtered = filterPostsAdminNavTree(
    navTreeFull.value,
    filterQuery.value,
  );
  const hasGlobalMatch = filterPostsByQuery(
    postsByStatus.value,
    filterQuery.value,
  ).length > 0;
  if (hasGlobalMatch && !filtered.some((n) => n.id === ALL_POSTS_NAV_ID)) {
    const allNode = findPostsAdminNavNode(navTreeFull.value, ALL_POSTS_NAV_ID);
    if (allNode) return [allNode, ...filtered];
  }
  return filtered;
});

const scopePosts = computed(() =>
  postsForNavSelection(
    selectedDirectoryId.value,
    postsByStatus.value,
    dirList.value,
  ),
);

const displayPosts = computed((): PostListItem[] => {
  const base = scopePosts.value;
  if (!searchActive.value) return base;
  return filterPostsByQuery(base, filterQuery.value);
});

const tablePosts = computed(() => {
  const posts = displayPosts.value;
  const showDirCol =
    searchActive.value ||
    selectedDirectoryId.value === ALL_POSTS_NAV_ID;
  if (!showDirCol) return posts;
  return attachDirectoryPaths(posts, directoryPathMap.value);
});

const selectedNav = computed(() =>
  findPostsAdminNavNode(navTreeFull.value, selectedDirectoryId.value),
);

const panelTitle = computed(() => {
  if (searchActive.value && selectedNav.value) {
    return `${selectedNav.value.name}（筛选结果）`;
  }
  return selectedNav.value?.name ?? "文章列表";
});

const panelSubtitle = computed(() => {
  if (!selectedNav.value) return "";
  if (searchActive.value) {
    return selectedNav.value.kind === "all"
      ? "在全库中匹配标题、slug 或状态"
      : selectedNav.value.pathLabel;
  }
  return selectedNav.value.pathLabel;
});

const tableEmptyText = computed(() => {
  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === statusFilter.value)?.label ?? "";
  if (statusFilter.value !== "all") {
    if (searchActive.value) {
      return `当前范围内无「${statusLabel}」匹配文章`;
    }
    return `当前范围内暂无「${statusLabel}」文章`;
  }
  if (searchActive.value) return "当前范围内无匹配文章";
  return "当前范围内暂无文章";
});

const showDirectoryColumn = computed(
  () =>
    searchActive.value ||
    selectedDirectoryId.value === ALL_POSTS_NAV_ID,
);

const statsAll = computed(() => {
  const all = postsList.value;
  return {
    total: all.length,
    published: all.filter((p) => p.status === "published").length,
    draft: all.filter((p) => p.status === "draft").length,
    archived: all.filter((p) => p.status === "archived").length,
  };
});

const canBatchDeleteDirectory = computed(
  () => displayPosts.value.length > 0,
);

const canBatchStatusDirectory = computed(
  () => displayPosts.value.length > 0,
);

function selectDirectory(id: number) {
  selectedDirectoryId.value = id;
  tableSelection.value = [];
  tableRef.value?.clearSelection();
  expandLibraryAncestors(
    navTreeFull.value,
    id,
    (dirId, open) => {
      dirExpanded[dirId] = open;
    },
  );
}

function setStatusFilter(value: PostStatusFilter) {
  statusFilter.value = value;
  tableSelection.value = [];
  tableRef.value?.clearSelection();
}

function statusLabel(status: PostListItem["status"]) {
  return BATCH_STATUS_TARGETS.find((o) => o.value === status)?.label ?? status;
}

async function applyBatchStatus(mode: "selection" | "directory") {
  const targets =
    mode === "selection" ? tableSelection.value : displayPosts.value;
  const count = targets.length;
  if (!count) return;

  const target = batchTargetStatus.value;
  const targetLabel = statusLabel(target);
  const scopeText =
    mode === "selection"
      ? `选中的 ${count} 篇文章`
      : `当前列表中的 ${count} 篇文章`;

  try {
    await ElMessageBox.confirm(
      `将 ${scopeText} 的状态统一改为「${targetLabel}」？已是该状态的文章将跳过。`,
      "批量修改状态",
      { type: "warning", confirmButtonText: "确认修改", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }

  batchStatusLoading.value = true;
  try {
    const res = await $fetch<PostBatchStatusResult>("/api/posts/batch-status", {
      method: "POST",
      body: { slugs: targets.map((p) => p.slug), status: target },
    });

    if (res.updated_count === 0) {
      ElMessage.info(`所选文章已全部是「${targetLabel}」状态`);
    } else {
      ElMessage.success(`已将 ${res.updated_count} 篇文章改为「${targetLabel}」`);
    }

    tableSelection.value = [];
    tableRef.value?.clearSelection();
    await loadAll();
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string };
    ElMessage.error(
      err?.data?.statusMessage || err?.message || "批量修改状态失败",
    );
  } finally {
    batchStatusLoading.value = false;
  }
}

function openBatchDeleteSelected() {
  if (!tableSelection.value.length) return;
  batchDeleteRequest.value = {
    mode: "selection",
    slugs: tableSelection.value.map((p) => p.slug),
  };
  batchDeleteOpen.value = true;
}

function openBatchDeleteDirectory() {
  if (!displayPosts.value.length) return;
  if (isRealDirectoryNavId(selectedDirectoryId.value)) {
    batchDeleteRequest.value = {
      mode: "directory",
      directory_id: selectedDirectoryId.value,
      directory_label: selectedNav.value?.name ?? "当前目录",
    };
  } else {
    batchDeleteRequest.value = {
      mode: "selection",
      slugs: displayPosts.value.map((p) => p.slug),
    };
  }
  batchDeleteOpen.value = true;
}

function onBatchDeleted() {
  batchDeleteOpen.value = false;
  batchDeleteRequest.value = null;
  tableSelection.value = [];
  tableRef.value?.clearSelection();
  loadAll();
}

function walkExpand(nodes: PostsAdminNavNode[], value: boolean) {
  for (const n of nodes) {
    if (n.children.length) {
      dirExpanded[n.id] = value;
      walkExpand(n.children, value);
    }
  }
}

function expandAllDirs() {
  walkExpand(navTreeFull.value, true);
}

function collapseAllDirs() {
  walkExpand(navTreeFull.value, false);
}

function expandSearchNav() {
  for (const id of collectNavNodeIds(displayNavTree.value)) {
    dirExpanded[id] = true;
  }
}

function ensureDefaultSelection() {
  if (selectedDirectoryId.value != null) {
    const still = findPostsAdminNavNode(
      navTreeFull.value,
      selectedDirectoryId.value,
    );
    if (still) return;
  }
  const first = firstPostsAdminNavNode(navTreeFull.value);
  if (first) selectDirectory(first.id);
}

watch(navTreeFull, () => {
  ensureDefaultSelection();
});

watch(filterQuery, (q, prev) => {
  if (!isSearchActive(q)) {
    ensureDefaultSelection();
    return;
  }
  if (!isSearchActive(prev ?? "")) {
    selectDirectory(ALL_POSTS_NAV_ID);
  }
  expandSearchNav();
});

watch(statusFilter, () => {
  tableSelection.value = [];
  tableRef.value?.clearSelection();
  if (searchActive.value) expandSearchNav();
});

async function loadAll() {
  loading.value = true;
  fetchError.value = null;
  try {
    const [dRes, pRes] = await Promise.all([
      $fetch<{ list: DirectoryRow[] }>("/api/directories/tree"),
      $fetch<{ list: PostListItem[] }>("/api/posts"),
    ]);
    dirList.value = dRes.list;
    postsList.value = pRes.list;
    postCache.setList(pRes.list);
    ensureDefaultSelection();
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string };
    fetchError.value = err?.data?.statusMessage || err?.message || "加载失败";
    dirList.value = [];
    postsList.value = [];
    selectedDirectoryId.value = ALL_POSTS_NAV_ID;
  } finally {
    loading.value = false;
  }
}

function applyDirectoryFromQuery() {
  const raw = route.query.dir;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n <= 0) return;
  if (!dirList.value.some((d) => d.id === n)) return;
  selectDirectory(n);
}

watch(
  () => route.query.dir,
  () => applyDirectoryFromQuery(),
);

onMounted(() => {
  void loadAll().then(() => applyDirectoryFromQuery());
});
</script>

<template>
  <div class="admin-module-page">
    <section class="admin-card admin-card--pad admin-module-page__top">
      <div class="admin-module-page__top-head">
        <div class="admin-module-page__intro">
          <h1 class="admin-module-page__title">文章</h1>
          <p class="admin-module-page__desc">
            按目录浏览与编辑文章；支持状态筛选、搜索与批量操作。目录请在「目录结构」中维护。
          </p>
        </div>
        <div v-if="!fetchError" class="admin-module-page__stat-cards" role="group" aria-label="文章统计">
          <button
            type="button"
            class="admin-module-page__stat-card admin-module-page__stat-card--interactive"
            :class="{ 'admin-module-page__stat-card--active': statusFilter === 'all' }"
            @click="setStatusFilter('all')"
          >
            <span class="admin-module-page__stat-value">{{ statsAll.total }}</span>
            <span class="admin-module-page__stat-label">全部</span>
          </button>
          <button
            type="button"
            class="admin-module-page__stat-card admin-module-page__stat-card--interactive admin-module-page__stat-card--published"
            :class="{ 'admin-module-page__stat-card--active': statusFilter === 'published' }"
            @click="setStatusFilter('published')"
          >
            <span class="admin-module-page__stat-value">{{ statsAll.published }}</span>
            <span class="admin-module-page__stat-label">已发布</span>
          </button>
          <button
            type="button"
            class="admin-module-page__stat-card admin-module-page__stat-card--interactive admin-module-page__stat-card--draft"
            :class="{ 'admin-module-page__stat-card--active': statusFilter === 'draft' }"
            @click="setStatusFilter('draft')"
          >
            <span class="admin-module-page__stat-value">{{ statsAll.draft }}</span>
            <span class="admin-module-page__stat-label">草稿</span>
          </button>
          <button
            v-if="statsAll.archived > 0"
            type="button"
            class="admin-module-page__stat-card admin-module-page__stat-card--interactive"
            :class="{ 'admin-module-page__stat-card--active': statusFilter === 'archived' }"
            @click="setStatusFilter('archived')"
          >
            <span class="admin-module-page__stat-value">{{ statsAll.archived }}</span>
            <span class="admin-module-page__stat-label">已归档</span>
          </button>
        </div>
      </div>

      <div class="admin-module-page__top-toolbar">
        <el-input
          v-model="filterQuery"
          clearable
          placeholder="搜索标题、slug 或状态"
          class="admin-module-page__search"
          :prefix-icon="Search"
        />
        <div class="admin-module-page__top-actions">
          <NuxtLink to="/admin/posts/new">
            <el-button type="primary" :icon="DocumentAdd">新建文章</el-button>
          </NuxtLink>
          <el-button :icon="Refresh" :loading="loading" @click="loadAll">
            刷新
          </el-button>
        </div>
      </div>
    </section>

    <el-alert
      v-if="fetchError"
      type="error"
      :closable="false"
      :title="fetchError"
      class="admin-module-page__alert"
    />

    <div v-else v-loading="loading" class="admin-module-page__split">
      <aside class="admin-card admin-card--pad admin-module-page__nav" aria-label="浏览范围">
        <div v-if="navTreeFull.length" class="admin-module-page__nav-head">
          <span class="admin-module-page__nav-label">
            {{ searchActive ? "匹配范围" : "浏览范围" }}
          </span>
          <div class="admin-module-page__nav-actions">
            <el-button size="small" text :icon="Expand" @click="expandAllDirs">
              展开
            </el-button>
            <el-button size="small" text :icon="Fold" @click="collapseAllDirs">
              折叠
            </el-button>
          </div>
        </div>
        <p v-if="!navTreeFull.length" class="admin-module-page__nav-empty">
          暂无目录，
          <NuxtLink to="/admin/posts/directories" class="admin-module-page__nav-link">
            去创建
          </NuxtLink>
        </p>
        <p
          v-else-if="searchActive && !displayNavTree.length"
          class="admin-module-page__nav-empty"
        >
          无匹配的目录或文章。
        </p>
        <div v-else class="admin-module-page__nav-tree">
          <PostsAdminNav
            :nodes="displayNavTree"
            :selected-id="selectedDirectoryId"
            @select="selectDirectory"
          />
        </div>
        <NuxtLink
          v-if="!fetchError"
          to="/admin/posts/directories"
          class="admin-module-page__nav-footer-link"
        >
          管理目录结构…
        </NuxtLink>
      </aside>

      <section class="admin-card admin-card--pad admin-module-page__list">
        <div class="admin-module-page__list-head">
          <h2 class="admin-module-page__list-title">{{ panelTitle }}</h2>
          <p v-if="panelSubtitle" class="admin-module-page__list-path">
            {{ panelSubtitle }}
          </p>
          <div class="admin-module-page__list-tags">
            <code
              v-if="selectedNav && selectedNav.kind === 'folder'"
              class="admin-module-page__list-slug"
            >
              {{ selectedNav.slug }}
            </code>
            <el-tag size="small" type="info">
              {{ displayPosts.length }} 篇
              <template v-if="statusFilter !== 'all'">
                · {{ STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label }}
              </template>
            </el-tag>
            <el-tag
              v-if="selectedNav && selectedNav.kind === 'folder'"
              size="small"
            >
              含子级 {{ subtreeCountForNav(selectedDirectoryId, postsByStatus, dirList) }} 篇
            </el-tag>
          </div>
        </div>

        <PostsBatchToolbar
          v-model:batch-target-status="batchTargetStatus"
          :selection-count="tableSelection.length"
          :directory-count="displayPosts.length"
          :can-apply-directory="canBatchStatusDirectory"
          :status-options="BATCH_STATUS_TARGETS"
          :status-loading="batchStatusLoading"
          :can-delete-selection="tableSelection.length > 0"
          :can-delete-directory="canBatchDeleteDirectory"
          class="admin-module-page__toolbar-band"
          @apply-status-selection="applyBatchStatus('selection')"
          @apply-status-directory="applyBatchStatus('directory')"
          @delete-selection="openBatchDeleteSelected"
          @delete-directory="openBatchDeleteDirectory"
        />

        <div class="admin-module-page__table-wrap">
          <PostDirectoryPostTable
            ref="tableRef"
            v-model:selected="tableSelection"
            :posts="tablePosts"
            :show-directory-column="showDirectoryColumn"
            :empty-text="tableEmptyText"
            @changed="loadAll"
          />
        </div>
      </section>
    </div>

    <PostBatchDeleteDialog
      v-model="batchDeleteOpen"
      :request="batchDeleteRequest"
      @deleted="onBatchDeleted"
    />

  </div>
</template>
