<script setup lang="ts">
import { FolderAdd, Refresh, Search } from "@element-plus/icons-vue";
import DirectoriesManagePanel from "~/components/directories/DirectoriesManagePanel.vue";
import type { DirectoryRow } from "~/types/directory";
import type { PostListItem } from "~/types/post";

definePageMeta({
  layout: "admin",
});

useHead({ title: "目录结构" });

const route = useRoute();
const router = useRouter();
const postCache = usePostCacheStore();

const dirList = ref<DirectoryRow[]>([]);
const postsList = ref<PostListItem[]>([]);
const loading = ref(false);
const fetchError = ref<string | null>(null);
const filterQuery = ref("");
const panelRef = ref<InstanceType<typeof DirectoriesManagePanel> | null>(null);

const focusDirectoryId = computed(() => {
  const raw = route.query.dir;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) && n > 0 ? n : null;
});

const stats = computed(() => ({
  directories: dirList.value.length,
  roots: dirList.value.filter((r) => r.parent_id == null).length,
  posts: postsList.value.length,
}));

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
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string };
    fetchError.value = err?.data?.statusMessage || err?.message || "加载失败";
    dirList.value = [];
    postsList.value = [];
  } finally {
    loading.value = false;
  }
}

function onBrowse(directoryId: number) {
  void router.push({
    path: "/admin/posts",
    query: { dir: String(directoryId) },
  });
}

function openCreateRoot() {
  panelRef.value?.openCreate(0);
}

onMounted(() => {
  void loadAll();
});
</script>

<template>
  <div class="admin-module-page">
    <section class="admin-card admin-card--pad admin-module-page__top">
      <div class="admin-module-page__top-head">
        <div class="admin-module-page__intro">
          <h1 class="admin-module-page__title">目录结构</h1>
          <p class="admin-module-page__desc">
            维护博客目录树，与前台侧栏展示一致。可新建、编辑、删除目录；删除目录会同步删除其下文章。
          </p>
        </div>
        <div
          v-if="!fetchError"
          class="admin-module-page__stat-cards"
          role="group"
          aria-label="目录统计"
        >
          <div class="admin-module-page__stat-card">
            <span class="admin-module-page__stat-value">{{ stats.directories }}</span>
            <span class="admin-module-page__stat-label">目录</span>
          </div>
          <div class="admin-module-page__stat-card">
            <span class="admin-module-page__stat-value">{{ stats.roots }}</span>
            <span class="admin-module-page__stat-label">一级</span>
          </div>
          <div class="admin-module-page__stat-card">
            <span class="admin-module-page__stat-value">{{ stats.posts }}</span>
            <span class="admin-module-page__stat-label">文章</span>
          </div>
        </div>
      </div>

      <div class="admin-module-page__top-toolbar">
        <el-input
          v-model="filterQuery"
          clearable
          placeholder="搜索目录名称或 slug"
          class="admin-module-page__search"
          :prefix-icon="Search"
        />
        <div class="admin-module-page__top-actions">
          <el-button type="primary" :icon="FolderAdd" @click="openCreateRoot">
            新建目录
          </el-button>
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

    <DirectoriesManagePanel
      v-else
      ref="panelRef"
      v-model:filter-query="filterQuery"
      :directories="dirList"
      :posts="postsList"
      :loading="loading"
      :focus-directory-id="focusDirectoryId"
      @success="loadAll"
      @browse="onBrowse"
    />
  </div>
</template>
