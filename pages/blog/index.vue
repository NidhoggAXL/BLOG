<script setup lang="ts">
definePageMeta({ layout: "default" });
useHead({ title: "博客" });

const { posts, loadPosts } = useBlogContent();
const { refreshPublicContent, refreshing } = usePublicContentRefresh();

await loadPosts();

const loadError = ref<string | null>(null);

async function onRefresh() {
  loadError.value = null;
  try {
    await refreshPublicContent();
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string };
    loadError.value =
      err?.data?.statusMessage || err?.message || "刷新失败，请稍后重试";
  }
}
</script>

<template>
  <PublicMainShell>
    <PublicArticleList
      :posts="posts"
      :refreshing="refreshing"
      :load-error="loadError"
      @refresh="onRefresh"
    />
  </PublicMainShell>
</template>
