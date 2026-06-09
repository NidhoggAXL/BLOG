<script setup lang="ts">
definePageMeta({ layout: "default" });

const route = useRoute();
const { loadPosts, loadDirectories } = useBlogContent();
const { syncPathForFolder, folderNameById } = useSiteMenu();
const { tocRailOpen } = useBlogReadPanels();

await Promise.all([loadDirectories(), loadPosts()]);

const dirId = computed(() => Number(route.params.id));

const dirName = computed(
  () => folderNameById(dirId.value) ?? "目录",
);

watch(
  dirId,
  (id) => {
    if (Number.isFinite(id) && id > 0) {
      syncPathForFolder(id);
    }
  },
  { immediate: true },
);

useHead(() => ({
  title: dirName.value,
}));
</script>

<template>
  <PublicMainShell class="blog-read-page">
    <div class="blog-read-page__workspace">
      <div
        class="blog-read-page__grid"
        :class="{ 'blog-read-page__grid--toc-open': tocRailOpen }"
      >
        <div class="post-panel">
          <PublicBlogBrowseEmpty :dir-name="dirName" />
        </div>
        <PublicTocRail
          :headings="[]"
          :post="null"
          :loading="false"
          :open="tocRailOpen"
        />
      </div>
    </div>
  </PublicMainShell>
</template>
