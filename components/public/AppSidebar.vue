<script setup lang="ts">
/** @deprecated 请使用 PublicSidebar；保留以兼容旧引用 */
const route = useRoute();
const { toggleTheme, isDark } = useAppTheme();
const { loadPosts, loadDirectories, posts } = useBlogContent();
const { refreshPublicContent, refreshing } = usePublicContentRefresh();
const { sidebarOpen, isBlogPostDetail } = useBlogReadPanels();

await Promise.all([loadDirectories(), loadPosts()]);

async function onRefresh() {
  await refreshPublicContent();
}

const {
  currentNodes,
  breadcrumbs,
  canExpandCollapse,
  enterFolder,
  goToBreadcrumb,
  syncPathForSlug,
  toggleExpand,
  expandAll,
  collapseAll,
  isExpanded,
  canInlineExpand,
  folderHasSubfolders,
} = useSiteMenu();

const sidebarCollapsed = computed(
  () => isBlogPostDetail.value && !sidebarOpen.value,
);

const activeSlug = computed(() => {
  if (!route.path.startsWith("/blog/")) {
    return undefined;
  }
  const param = route.params.slug;
  if (!param) {
    return undefined;
  }
  return Array.isArray(param) ? param.join("/") : String(param);
});

watch(
  activeSlug,
  (slug) => {
    if (slug) {
      syncPathForSlug(slug);
    }
  },
  { immediate: true },
);
</script>

<template>
  <aside
    class="sidebar"
    :class="{ 'sidebar--collapsed': sidebarCollapsed }"
    :aria-hidden="sidebarCollapsed"
  >
    <div class="sidebar-card card">
      <div class="side-header">
        <h2 class="side-title">目录</h2>
        <nav v-if="breadcrumbs.length > 1" class="breadcrumb">
          <template
            v-for="(crumb, index) in breadcrumbs"
            :key="crumb.id ?? 'root'"
          >
            <button
              v-if="index < breadcrumbs.length - 1"
              type="button"
              class="crumb-btn"
              @click="goToBreadcrumb(index)"
            >
              {{ crumb.name }}
            </button>
            <span v-else class="crumb-current">{{ crumb.name }}</span>
            <span v-if="index < breadcrumbs.length - 1" class="crumb-sep"
              >/</span
            >
          </template>
        </nav>
        <div class="side-toolbar">
          <button
            type="button"
            class="tool-btn tool-btn--refresh"
            :disabled="refreshing"
            :title="refreshing ? '正在刷新…' : '从服务器重新加载目录与文章'"
            @click="onRefresh"
          >
            {{ refreshing ? "刷新中…" : "刷新" }}
          </button>
          <template v-if="canExpandCollapse">
            <button type="button" class="tool-btn" @click="expandAll">
              展开
            </button>
            <button type="button" class="tool-btn" @click="collapseAll">
              折叠
            </button>
          </template>
        </div>
      </div>

      <div class="file-tree-wrap no-scrollbar">
        <BlogDirList
          v-if="currentNodes.length"
          :nodes="currentNodes"
          :active-slug="activeSlug"
          :enable-inline-expand="canInlineExpand"
          :is-expanded="isExpanded"
          :folder-has-subfolders="folderHasSubfolders"
          @enter="enterFolder"
          @toggle-expand="toggleExpand"
        />
        <p v-else-if="!posts.length" class="dir-empty">
          暂无已发布文章。后台草稿/归档不会显示在前台。
        </p>
        <p v-else class="dir-empty">此目录为空</p>
      </div>

      <div class="sidebar-footer">
        <button
          type="button"
          class="theme-btn"
          :title="isDark ? '切换为亮色' : '切换为暗色'"
          @click="toggleTheme"
        >
          <span class="theme-icon">{{ isDark ? "☀" : "☾" }}</span>
          <span>{{ isDark ? "亮色模式" : "暗色模式" }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    width 0.52s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.45s ease;
}

.sidebar--collapsed {
  width: 0;
  opacity: 0;
  pointer-events: none;
}

.sidebar-card {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--card-padding);
  overflow: hidden;
}

.side-header {
  flex-shrink: 0;
  margin-bottom: 0.75rem;
}

.side-title {
  margin: 0 0 0.65rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.02em;
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.crumb-btn {
  padding: 0.15rem 0.1rem;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--accent);
  font-size: inherit;
  line-height: inherit;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;

  &:hover {
    background: var(--accent-soft);
    color: var(--accent-hover);
  }
}

.crumb-current {
  padding: 0.15rem 0.1rem;
  color: var(--text);
  font-weight: 500;
}

.crumb-sep {
  color: var(--muted);
  margin: 0 0.15rem;
  user-select: none;
}

.side-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tool-btn--refresh {
  flex: 1 1 100%;
}

.tool-btn {
  flex: 1;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 0.8125rem;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;

  &:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--accent);
    border-color: var(--accent);
  }

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }
}

.file-tree-wrap {
  flex: 1;
  min-height: 0;
  margin-bottom: 0.75rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.dir-empty {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--muted);
}

.sidebar-footer {
  flex-shrink: 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;

  &:hover {
    background: var(--bg-hover);
    border-color: var(--muted);
    color: var(--text);
  }
}

.theme-icon {
  font-size: 1rem;
  line-height: 1;
}
</style>
