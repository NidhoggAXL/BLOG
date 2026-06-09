<script setup lang="ts">
defineProps<{
  dirName?: string;
}>();
</script>

<template>
  <div class="blog-browse-empty card card-padding">
    <h2 class="blog-browse-empty__title">
      {{ dirName ? `「${dirName}」` : "当前目录" }}
    </h2>
    <p class="blog-browse-empty__hint">请从左侧目录选择一篇文章开始阅读。</p>
    <NuxtLink to="/blog" class="blog-browse-empty__back">← 返回首页</NuxtLink>
  </div>
</template>

<style scoped lang="less">
.blog-browse-empty {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 0.65rem;
}

.blog-browse-empty__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
}

.blog-browse-empty__hint {
  margin: 0;
  font-size: 0.92rem;
  color: var(--muted);
}

.blog-browse-empty__back {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--accent);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
