<script setup lang="ts">
import type { PublicPostDetail } from "~/types/blog";

defineProps<{
  post: PublicPostDetail | null;
  loading: boolean;
  showNotFound: boolean;
  slug: string;
  pendingTitle: string;
  similarSlugHint: string | null;
  similarTitle: string;
}>();
</script>

<template>
  <div class="post-panel">
    <div
      class="post-card card card-padding"
      :class="{ 'post-card--loading': loading }"
    >
      <div class="post-scroll no-scrollbar">
        <BlogPostDetail v-if="post" :post="post" />
        <div
          v-else-if="loading"
          class="post-loading"
          role="status"
          aria-live="polite"
          :aria-label="`正在加载：${pendingTitle}`"
        >
          <div class="post-loading__head">
            <div
              class="route-loading-spinner post-loading__spinner"
              aria-hidden="true"
            />
            <div class="post-loading__text">
              <p class="post-loading__label">正在加载</p>
              <p class="post-loading__title">{{ pendingTitle }}</p>
            </div>
          </div>
          <div class="post-skeleton" aria-hidden="true">
            <div class="post-skeleton__line post-skeleton__line--title" />
            <div class="post-skeleton__line" />
            <div class="post-skeleton__line post-skeleton__line--w70" />
            <div class="post-skeleton__line post-skeleton__line--block" />
            <div class="post-skeleton__line post-skeleton__line--block" />
          </div>
        </div>
        <div v-else-if="showNotFound" class="post-not-found">
          <p>未找到文章「{{ slug }}」。</p>
          <p v-if="similarSlugHint" class="post-not-found__hint">
            是否要访问：
            <NuxtLink
              :to="`/blog/${similarSlugHint}`"
              class="post-not-found__link"
            >
              {{ similarTitle }}
            </NuxtLink>
            ？
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.post-card {
  position: relative;
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.post-card--loading .post-scroll {
  filter: saturate(0.9);
}

.post-loading {
  padding: 4px 0 8px;
}

.post-loading__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.post-loading__text {
  min-width: 0;
  flex: 1;
}

.post-loading__label {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.post-loading__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text);
  word-break: break-word;
}

.post-loading__spinner {
  flex-shrink: 0;
  margin-top: 4px;
  width: 18px;
  height: 18px;
  border-width: 2px;
}

.post-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.post-not-found {
  margin: 0;
  padding: 12px 0;
  color: var(--muted);
  line-height: 1.6;
}

.post-not-found__hint {
  margin: 10px 0 0;
  color: var(--text-secondary);
}

.post-not-found__link {
  color: var(--accent);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    color: var(--accent-hover);
    text-decoration: underline;
  }
}

@media (max-width: 768px) {
  .post-card {
    min-height: 50vh;
  }
}
</style>
