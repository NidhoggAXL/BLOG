<script setup lang="ts">
useHead({
  titleTemplate: (t) => (t ? `${t} · 个人博客` : '个人博客'),
})

const auth = useAuthStore()
if (!auth.checked) {
  await auth.fetchMe()
}

const { sidebarOpen, tocRailOpen, isBlogPostDetail, isPublicContentInset, showPublicSidebar } =
  useBlogReadPanels()
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'app-shell--blog-read': isBlogPostDetail }"
  >
    <PublicTopNav />
    <div
      class="app-body"
      :class="{
        'app-body--blog-read': isBlogPostDetail,
        'app-body--content-inset': isPublicContentInset,
      }"
    >
      <button
        v-if="isBlogPostDetail"
        type="button"
        class="blog-read-edge blog-read-edge--left"
        :aria-label="sidebarOpen ? '隐藏目录' : '显示目录'"
        :aria-expanded="sidebarOpen"
        @click="sidebarOpen = !sidebarOpen"
      >
        <span class="blog-read-edge-glyph" aria-hidden="true">{{
          sidebarOpen ? "《" : "》"
        }}</span>
      </button>
      <div
        class="app-body__content"
        :class="{ 'app-body__content--no-sidebar': !showPublicSidebar }"
      >
        <PublicSidebar v-if="showPublicSidebar" />
        <main class="app-main">
          <slot />
        </main>
      </div>
      <button
        v-if="isBlogPostDetail"
        type="button"
        class="blog-read-edge blog-read-edge--right"
        :aria-label="tocRailOpen ? '隐藏大纲与双链' : '显示大纲与双链'"
        :aria-expanded="tocRailOpen"
        @click="tocRailOpen = !tocRailOpen"
      >
        <span class="blog-read-edge-glyph" aria-hidden="true">{{
          tocRailOpen ? "》" : "《"
        }}</span>
      </button>
    </div>
    <PublicAiFab />
  </div>
</template>

<style lang="less">
@import "~/assets/styles/blog-read-panels.less";
</style>

<style scoped lang="less">
@import '~/assets/less/_tokens.less';

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  padding: var(--layout-gap);
  gap: var(--layout-gap);
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-body__content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  gap: var(--layout-gap);
  align-items: stretch;
}

.app-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
