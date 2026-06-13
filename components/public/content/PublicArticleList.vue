<script setup lang="ts">
import type { PublicPostMeta } from "~/types/blog";
import { formatPublicDisplayName } from "~/utils/obsidianDisplayPrefix";

defineProps<{
  posts: PublicPostMeta[];
  refreshing: boolean;
  loadError: string | null;
}>();

const emit = defineEmits<{
  refresh: [];
}>();
</script>

<template>
  <div class="blog-list card card-padding no-scrollbar">
    <BlogMainHeader title="文章列表" subtitle="数据来自本地 MySQL（已发布文章）" />
    <p v-if="refreshing && !posts.length" class="blog-list__hint">加载中...</p>
    <p v-else-if="loadError" class="blog-list__hint blog-list__hint--error">
      {{ loadError }}
    </p>
    <div v-else-if="posts.length" class="blog-list__items">
      <NuxtLink
        v-for="post in posts"
        :key="post.slug"
        :to="`/blog/${post.slug}`"
        class="blog-item"
      >
        <h2 class="blog-item__title">
          {{ formatPublicDisplayName(post.title?.trim() || post.slug) }}
        </h2>
        <p class="blog-item__meta">{{ post.date }}</p>
      </NuxtLink>
    </div>
    <p v-else class="blog-list__hint">暂无文章。</p>
    <button
      type="button"
      class="blog-list__refresh"
      :disabled="refreshing"
      @click="emit('refresh')"
    >
      {{ refreshing ? "刷新中…" : "刷新" }}
    </button>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.blog-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.blog-list__items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.blog-item {
  display: block;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  transition: background 0.12s, border-color 0.12s;

  &:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
  }
}

.blog-item__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.blog-item__meta {
  margin: 0.3rem 0 0;
  color: var(--muted);
  font-size: 0.84rem;
}

.blog-list__hint {
  margin: 0;
  color: var(--muted);
}

.blog-list__hint--error {
  color: #d93025;
}

.blog-list__refresh {
  margin-top: 1rem;
  align-self: flex-start;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-secondary);
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text);
  }

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }
}
</style>
