<script setup lang="ts">
import type { TreeNode } from "~/types/blog";

const { loadPosts, loadDirectories } = useBlogContent();
const { rootDirectories, enterRootDirectory } = useSiteMenu();

await Promise.all([loadDirectories(), loadPosts()]);

function onDirClick(node: TreeNode) {
  enterRootDirectory(node);
}
</script>

<template>
  <div class="blog-landing">
    <div class="blog-landing__inner">
      <div class="blog-landing__hero card">
        <PublicProfileBar expand-bio />
      </div>

      <section class="blog-landing__dirs" aria-label="一级目录">
        <p v-if="!rootDirectories.length" class="blog-landing__dirs-empty">
          暂无一级目录，请先在后台创建目录并发布文章。
        </p>
        <ul v-else class="blog-landing__dir-grid">
          <li v-for="node in rootDirectories" :key="node.id">
            <button
              type="button"
              class="blog-landing__dir-card card"
              @click="onDirClick(node)"
            >
              <span class="blog-landing__dir-name">{{ node.name }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.blog-landing {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(1.25rem, 5vh, 3rem) 1.25rem 2rem;
}

.blog-landing__inner {
  width: min(100%, 52rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1.25rem, 3vh, 2rem);
}

.blog-landing__hero {
  width: min(100%, 26rem);
  padding: 0;
  overflow: hidden;
}

.blog-landing__dirs {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.blog-landing__dirs-empty {
  margin: 0;
  width: 100%;
  max-width: 28rem;
  padding: 1.35rem 1.25rem;
  border-radius: var(--card-radius);
  border: 1px dashed var(--border);
  color: var(--muted);
  font-size: 0.9rem;
  text-align: center;
}

.blog-landing__dir-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}

.blog-landing__dir-grid > li {
  flex: 0 1 auto;
}

.blog-landing__dir-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 10.5rem;
  min-height: 5.25rem;
  padding: 1.35rem 2rem;
  border: 1px solid var(--border);
  border-radius: var(--card-radius);
  background: var(--bg-elevated);
  color: var(--text);
  text-align: center;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: var(--card-shadow);
  }
}

.blog-landing__dir-name {
  font-size: 1.08rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.02em;
}

@media (min-width: 640px) {
  .blog-landing__dir-card {
    min-width: 12.5rem;
    min-height: 5.75rem;
    padding: 1.5rem 2.25rem;
  }

  .blog-landing__dir-name {
    font-size: 1.12rem;
  }
}
</style>
