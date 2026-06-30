<script setup lang="ts">
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
const panelRef = ref<InstanceType<typeof DirectoriesManagePanel> | null>(null);

const focusDirectoryId = computed(() => {
  const raw = route.query.dir;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) && n > 0 ? n : null;
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

onMounted(() => {
  void loadAll();
});
</script>

<template>
  <DirectoriesManagePanel
    ref="panelRef"
    :directories="dirList"
    :posts="postsList"
    :loading="loading"
    :fetch-error="fetchError"
    :focus-directory-id="focusDirectoryId"
    @success="loadAll"
    @refresh="loadAll"
    @browse="onBrowse"
  />
</template>
