<script setup lang="ts">
import type { PublicPostDetail } from "~/types/blog";

const props = defineProps<{
  post: PublicPostDetail;
}>();

const { onMarkdownContentClick } = useSpaMarkdownLinkClick("/blog/");
</script>

<template>
  <article class="post-detail">
    <header class="post-header">
      <h1 class="post-title">{{ post.title }}</h1>
      <div class="post-meta">
        <time :datetime="post.date">{{ post.date }}</time>
        <span v-if="post.tags.length" class="meta-divider">·</span>
        <ul v-if="post.tags.length" class="post-tags">
          <li v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</li>
        </ul>
      </div>
    </header>
    <div class="post-read-body post-read-body--public">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        class="post-read markdown-body"
        v-html="post.body_html"
        @click="onMarkdownContentClick"
      />
    </div>
  </article>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.post-detail {
  max-width: none;
  width: 100%;
}

.post-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.post-title {
  margin: 0 0 0.75rem;
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text);
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  font-size: 0.875rem;
  color: var(--muted);
}

.meta-divider {
  opacity: 0.6;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.tag {
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.8rem;
}
</style>
