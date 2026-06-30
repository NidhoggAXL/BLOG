<script setup lang="ts">
import {
  Expand,
  Fold,
} from "@element-plus/icons-vue";
import PostBatchDeleteDialog from "~/components/posts/PostBatchDeleteDialog.vue";
import type { BatchDeleteRequest } from "~/components/posts/PostBatchDeleteDialog.vue";
import PostsAdminNav from "~/components/posts/PostsAdminNav.vue";
import PostsBatchToolbar from "~/components/posts/PostsBatchToolbar.vue";
import PostDirectoryPostTable from "~/components/posts/PostDirectoryPostTable.vue";
import PostsTableToolbar from "~/components/posts/PostsTableToolbar.vue";
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
  buildPostsAdminNavTree,
  filterPostsAdminNavTree,
  findPostsAdminNavNode,
  firstPostsAdminNavNode,
  postsForNavSelection,
  type PostsAdminNavNode,
} from "~/utils/postsAdminNav";
import { isRealDirectoryNavId } from "~/utils/isRealDirectoryNavId";
import {
  ADMIN_POSTS_LIST_TOOLBAR_DEFAULT,
  useAdminPageToolbar,
} from "~/composables/useAdminPageToolbar";

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
const selectedDirectoryId = ref<number | null>(null);
const tableSelection = ref<PostListItem[]>([]);
const tableRef = ref<InstanceType<typeof PostDirectoryPostTable> | null>(null);
const batchDeleteOpen = ref(false);
const batchDeleteRequest = ref<BatchDeleteRequest | null>(null);
const batchTargetStatus = ref<PostListItem["status"]>("published");
const batchStatusLoading = ref(false);
const navDrawerOpen = ref(false);
const isCardView = ref(false);
const postCache = usePostCacheStore();
const route = useRoute();
const dirExpanded = reactive<Record<number, boolean>>({});
provide("postsDirExpanded", dirExpanded);

const { setToolbarConfig } = useAdminPageToolbar();

watchEffect(() => {
  setToolbarConfig(
    {
      ...ADMIN_POSTS_LIST_TOOLBAR_DEFAULT,
      hideActions: !!fetchError.value,
      loading: loading.value,
    },
    loadAll,
  );
});

onUnmounted(() => {
  setToolbarConfig(null);
});

let cardViewMq: MediaQueryList | null = null;

function onCardViewMqChange(e: MediaQueryListEvent | MediaQueryList) {
  isCardView.value = e.matches;
}

onMounted(() => {
  if (import.meta.client) {
    cardViewMq = window.matchMedia("(max-width: 600px)");
    onCardViewMqChange(cardViewMq);
    cardViewMq.addEventListener("change", onCardViewMqChange);
  }
  void loadAll().then(() => applyDirectoryFromQuery());
});

onUnmounted(() => {
  cardViewMq?.removeEventListener("change", onCardViewMqChange);
  cardViewMq = null;
});

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
  return filterPostsAdminNavTree(navTreeFull.value, filterQuery.value);
});

const scopePosts = computed(() =>
  postsForNavSelection(
    selectedDirectoryId.value,
    postsByStatus.value,
    dirList.value,
  ),
);

const displayPosts = computed((): PostListItem[] => {
  if (searchActive.value) {
    return filterPostsByQuery(postsByStatus.value, filterQuery.value);
  }
  return scopePosts.value;
});

const tablePosts = computed(() => {
  const posts = displayPosts.value;
  if (!searchActive.value) return posts;
  return attachDirectoryPaths(posts, directoryPathMap.value);
});

const selectedNav = computed(() =>
  findPostsAdminNavNode(navTreeFull.value, selectedDirectoryId.value),
);

const panelTitle = computed(() => {
  if (searchActive.value) return "搜索结果";
  return selectedNav.value?.name ?? "文章列表";
});

const panelSubtitle = computed(() => {
  if (searchActive.value) {
    return "匹配标题、slug 或状态";
  }
  const nav = selectedNav.value;
  if (!nav) return "";
  if (nav.kind === "folder" && nav.pathLabel !== nav.name) {
    return nav.pathLabel;
  }
  return "";
});

const listArticleCount = computed(() => {
  if (searchActive.value) return displayPosts.value.length;
  const nav = selectedNav.value;
  if (!nav) return 0;
  return nav.postCount;
});

const listChildDirCount = computed(() => {
  const nav = selectedNav.value;
  if (!nav || nav.kind !== "folder") return 0;
  return nav.children.length;
});

const listStatusLabel = computed(() => {
  if (statusFilter.value === "all") return "";
  return STATUS_OPTIONS.find((o) => o.value === statusFilter.value)?.label ?? "";
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

const showDirectoryColumn = computed(() => searchActive.value);

const statsAll = computed(() => {
  const all = postsList.value;
  return {
    total: all.length,
    published: all.filter((p) => p.status === "published").length,
    draft: all.filter((p) => p.status === "draft").length,
    archived: all.filter((p) => p.status === "archived").length,
  };
});

const statusViews = computed(() =>
  STATUS_OPTIONS.map((opt) => ({
    ...opt,
    count:
      opt.value === "all"
        ? statsAll.value.total
        : opt.value === "published"
          ? statsAll.value.published
          : opt.value === "draft"
            ? statsAll.value.draft
            : statsAll.value.archived,
  })),
);

function clearTableSelection() {
  tableSelection.value = [];
  tableRef.value?.clearSelection();
}

function selectDirectoryAndCloseNav(id: number) {
  selectDirectory(id);
  navDrawerOpen.value = false;
}

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

watch(filterQuery, (q) => {
  if (!isSearchActive(q)) {
    ensureDefaultSelection();
    return;
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
    selectedDirectoryId.value = null;
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
</script>

<template>
  <div class="admin-module-page">
    <el-alert
      v-if="fetchError"
      type="error"
      :closable="false"
      :title="fetchError"
      class="admin-module-page__alert"
    />

    <div
      v-else
      v-loading="loading"
      class="admin-module-page__split"
      :class="{ 'admin-module-page__split--nav-open': navDrawerOpen }"
    >
      <div
        v-if="navDrawerOpen"
        class="admin-module-page__nav-backdrop"
        aria-hidden="true"
        @click="navDrawerOpen = false"
      />

      <aside class="admin-card admin-card--pad admin-module-page__nav" aria-label="浏览范围">
        <div v-if="navTreeFull.length" class="admin-module-page__nav-head">
          <span class="admin-module-page__nav-label">
            {{ searchActive ? "匹配范围" : "浏览范围" }}
          </span>
          <div class="admin-module-page__nav-actions">
            <el-button size="small" text :icon="Expand" title="全部展开" @click="expandAllDirs" />
            <el-button size="small" text :icon="Fold" title="全部折叠" @click="collapseAllDirs" />
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
            flat
            @select="selectDirectoryAndCloseNav"
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
        <div
          v-if="!fetchError"
          class="admin-module-page__status-views admin-module-page__status-views--list"
          role="group"
          aria-label="状态筛选"
        >
          <button
            v-for="view in statusViews"
            :key="view.value"
            type="button"
            class="admin-module-page__status-view"
            :class="{
              'admin-module-page__status-view--active': statusFilter === view.value,
              'admin-module-page__status-view--published': view.value === 'published',
              'admin-module-page__status-view--draft': view.value === 'draft',
            }"
            @click="setStatusFilter(view.value)"
          >
            <span class="admin-module-page__status-view-label">{{ view.label }}</span>
            <span class="admin-module-page__status-view-badge">{{ view.count }}</span>
          </button>
        </div>

        <div class="admin-module-page__list-top">
          <Transition name="posts-toolbar-swap" mode="out-in">
            <PostsBatchToolbar
              v-if="tableSelection.length > 0"
              :key="'batch'"
              v-model:batch-target-status="batchTargetStatus"
              :selection-count="tableSelection.length"
              :directory-count="displayPosts.length"
              :can-apply-directory="canBatchStatusDirectory"
              :status-options="BATCH_STATUS_TARGETS"
              :status-loading="batchStatusLoading"
              :can-delete-directory="canBatchDeleteDirectory"
              class="admin-module-page__toolbar-band"
              @apply-status-selection="applyBatchStatus('selection')"
              @apply-status-directory="applyBatchStatus('directory')"
              @delete-selection="openBatchDeleteSelected"
              @delete-directory="openBatchDeleteDirectory"
              @clear-selection="clearTableSelection"
            />
            <div v-else :key="'table'" class="admin-module-page__list-top-row">
              <div class="admin-module-page__list-head">
                <h2 class="admin-module-page__list-title">{{ panelTitle }}</h2>
                <div class="admin-module-page__list-sub">
                  <span v-if="panelSubtitle">{{ panelSubtitle }}</span>
                  <span v-if="selectedNav?.kind === 'folder'">
                    <code class="admin-module-page__list-slug">{{ selectedNav.slug }}</code>
                  </span>
                  <span>
                    含文章 {{ listArticleCount }} 篇<template v-if="listStatusLabel">（{{ listStatusLabel }}）</template>
                  </span>
                  <span v-if="selectedNav?.kind === 'folder'">
                    子目录 {{ listChildDirCount }} 个
                  </span>
                </div>
              </div>
              <PostsTableToolbar
                v-model:filter-query="filterQuery"
                inline
                show-nav-toggle
                @toggle-nav="navDrawerOpen = !navDrawerOpen"
              />
            </div>
          </Transition>
        </div>

        <div class="admin-module-page__table-wrap">
          <PostDirectoryPostTable
            ref="tableRef"
            v-model:selected="tableSelection"
            :posts="tablePosts"
            :show-directory-column="showDirectoryColumn"
            :card-view="isCardView"
            :empty-text="tableEmptyText"
            @changed="loadAll"
          />
        </div>

        <footer class="admin-module-page__table-footer">
          共 {{ listArticleCount }} 篇<template v-if="listStatusLabel"> · {{ listStatusLabel }}</template>
        </footer>
      </section>
    </div>

    <PostBatchDeleteDialog
      v-model="batchDeleteOpen"
      :request="batchDeleteRequest"
      @deleted="onBatchDeleted"
    />
  </div>
</template>
