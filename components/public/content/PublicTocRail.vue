<script setup lang="ts">
import type { PublicPostDetail, TocHeading } from "~/types/blog";

defineProps<{
  headings: TocHeading[];
  post: PublicPostDetail | null;
  loading: boolean;
  open: boolean;
}>();
</script>

<template>
  <aside
    class="toc-rail blog-read-page__toc"
    :aria-hidden="!open"
  >
    <div class="blog-read-page__toc-surface">
      <div
        class="toc-card toc-card--outline card card-padding"
        :class="{ 'toc-card--loading': loading }"
      >
        <div class="toc-scroll no-scrollbar">
          <div v-if="loading" class="toc-loading" aria-hidden="true">
            <div class="post-skeleton__line post-skeleton__line--title" />
            <div class="post-skeleton__line post-skeleton__line--w70" />
            <div class="post-skeleton__line" />
          </div>
          <BlogHeadingToc v-else :headings="headings" />
        </div>
      </div>

      <div
        v-if="!loading && post"
        class="toc-card toc-card--links card card-padding"
      >
        <header class="toc-card__head">
          <h2 class="toc-card__title">双链</h2>
        </header>
        <div class="toc-scroll no-scrollbar">
          <PostWikilinkLinksPanel
            :inbound="post.inbound_links ?? []"
            :outbound="post.outbound_links ?? []"
            base-path="/blog/"
            variant="public"
          />
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.toc-rail {
  flex-shrink: 0;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.toc-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toc-card--outline {
  flex: 1 1 48%;
  min-height: 8rem;
}

.toc-card--links {
  flex: 1 1 52%;
  min-height: 9rem;
}

.toc-card__head {
  flex-shrink: 0;
  margin-bottom: 0.75rem;
}

.toc-card--links .toc-card__head {
  text-align: center;
}

.toc-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.toc-card--loading {
  opacity: 0.7;
}

.toc-loading {
  padding: 4px 0;
}

.toc-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .toc-rail {
    width: 100%;
    flex: none;
  }

  .toc-card--outline,
  .toc-card--links {
    min-height: 10rem;
  }
}
</style>
