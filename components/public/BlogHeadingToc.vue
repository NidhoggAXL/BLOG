<script setup lang="ts">
import type { TocHeading } from "~/types/blog";

defineProps<{
  headings: TocHeading[];
  compact?: boolean;
}>();

function scrollToAnchor(id: string) {
  if (!import.meta.client) {
    return;
  }
  const el = document.getElementById(id);
  if (!el) {
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}
</script>

<template>
  <nav v-if="headings.length" class="heading-toc">
    <BlogMainHeader v-if="!compact" title="大纲" subtitle="文章标题导航" />
    <ul class="toc-list">
      <li
        v-for="item in headings"
        :key="item.id"
        class="toc-item"
        :class="`level-${item.level}`"
      >
        <a
          :href="`#${item.id}`"
          class="toc-link"
          @click.prevent="scrollToAnchor(item.id)"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
  <p v-else class="toc-empty">本文暂无标题大纲</p>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.heading-toc {
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
}

.toc-item {
  margin-bottom: 0.2rem;

  &.level-1 .toc-link {
    font-weight: 600;
    color: var(--text);
  }

  &.level-2 {
    padding-left: 0.5rem;
  }

  &.level-3 {
    padding-left: 1rem;
  }

  &.level-4 {
    padding-left: 1.5rem;
  }

  &.level-5 {
    padding-left: 2rem;
  }

  &.level-6 {
    padding-left: 2.5rem;
  }
}

.toc-link {
  display: block;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--text-secondary);
  text-decoration: none;
  transition:
    background 0.12s,
    color 0.12s;

  &:hover {
    background: var(--bg-hover);
    color: var(--accent);
  }
}

.toc-empty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
