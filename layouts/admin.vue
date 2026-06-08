<template>
  <div class="admin-shell">
    <div class="admin-shell__layout">
      <aside class="admin-card admin-sidebar-card" aria-label="功能目录">
        <div class="sidebar-brand">
          <AuthLogoutButton
            button-type="default"
            :confirm="true"
            class="brand-logout"
          />
        </div>

        <nav class="sidebar-nav">
          <template v-for="item in menu" :key="item.to">
            <div
              v-if="item.children?.length"
              class="nav-group"
              :class="{ 'nav-group--open': isPostsSectionRoute }"
            >
              <NuxtLink
                :to="item.to"
                class="nav-item"
                :class="{ 'nav-item--active': isMenuActive(item.to) }"
              >
                <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </NuxtLink>
              <div class="nav-group__children">
                <NuxtLink
                  v-for="child in item.children"
                  :key="child.to"
                  :to="child.to"
                  class="nav-item"
                  :class="{ 'nav-item--active': isMenuActive(child.to) }"
                >
                  <span class="nav-icon" aria-hidden="true">{{ child.icon }}</span>
                  <span>{{ child.label }}</span>
                </NuxtLink>
              </div>
            </div>
            <NuxtLink
              v-else
              :to="item.to"
              class="nav-item"
              :class="{ 'nav-item--active': isMenuActive(item.to) }"
            >
              <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </NuxtLink>
          </template>
        </nav>
      </aside>

      <div class="admin-main">
        <header class="admin-card admin-toolbar-card" aria-label="功能按钮">
          <div class="toolbar-title">{{ title }}</div>
          <div class="toolbar-actions">
            <NuxtLink to="/" class="btn btn-ghost">查看站点</NuxtLink>
            <ThemeToggle />
            <button
              type="button"
              class="btn btn-ghost"
              @click="importOpen = true"
            >
              导入文件
            </button>
          </div>
        </header>

        <main
          class="admin-card admin-card--stretch admin-workspace"
          :class="{ 'admin-workspace--fill': isFillPage }"
        >
          <div class="admin-page" :class="{ 'admin-page--fill': isFillPage }">
            <slot />
          </div>
        </main>
      </div>
    </div>
    <PostImportFolderDialog v-model="importOpen" />
  </div>
</template>

<script setup lang="ts">
import PostImportFolderDialog from "~/components/posts/PostImportFolderDialog.vue";

useHead({
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const route = useRoute();
const auth = useAuthStore();
const importOpen = ref(false);

onMounted(() => {
  if (!auth.checked) auth.fetchMe();
});

const menu = [
  { to: "/admin", label: "控制台", icon: "◆" },
  {
    to: "/admin/posts",
    label: "文章",
    icon: "▤",
    children: [
      { to: "/admin/posts/directories", label: "目录结构", icon: "▦" },
    ],
  },
  { to: "/admin/graph", label: "知识图谱", icon: "⬡" },
  { to: "/admin/profile", label: "个人信息", icon: "◉" },
] as const;

const isPostsSectionRoute = computed(() => {
  const path = route.path;
  return path === "/admin/posts" || path.startsWith("/admin/posts/");
});

/** 需要占满工作区高度的页面（文章列表、图谱等） */
const fillRoutes = ["/admin/posts", "/admin/posts/directories", "/admin/graph"];

/** 长表单/配置页：需在工作区内滚动，不能套用 fill 的 overflow:hidden */
const fillRouteExcludes = ["/admin/posts/new"];

const isFillPage = computed(() => {
  const path = route.path;
  if (fillRouteExcludes.some((p) => path === p || path.startsWith(`${p}/`))) {
    return false;
  }
  return fillRoutes.some((p) => path === p || path.startsWith(`${p}/`));
});

const title = computed(() => {
  const path = route.path;
  const flat: { to: string; label: string }[] = [];
  for (const item of menu) {
    flat.push({ to: item.to, label: item.label });
    if ("children" in item && item.children) {
      for (const child of item.children) {
        flat.push({ to: child.to, label: child.label });
      }
    }
  }
  const sorted = [...flat].sort((a, b) => b.to.length - a.to.length);
  if (path.startsWith("/admin/posts/import")) return "批量导入";
  const hit = sorted.find((i) => path === i.to || path.startsWith(`${i.to}/`));
  return hit?.label ?? "控制台";
});

function isMenuActive(to: string) {
  const path = route.path;
  if (to === "/admin") return path === "/admin";
  if (to === "/admin/posts/directories") {
    return path === to || path.startsWith(`${to}/`);
  }
  if (to === "/admin/posts") {
    return (
      path === "/admin/posts" ||
      (path.startsWith("/admin/posts/") &&
        !path.startsWith("/admin/posts/directories"))
    );
  }
  return path === to || path.startsWith(`${to}/`);
}

</script>

<style lang="less">
@import "~/assets/styles/admin-layout.less";
@import "~/assets/styles/admin-module-page.less";
@import "~/assets/styles/admin-tree-nav.less";
@import "~/assets/styles/admin-data-table.less";
@import "~/assets/styles/dashboard.less";
@import "~/assets/styles/compose-wikilink-autocomplete.less";
</style>

<style scoped lang="less">
@import "~/assets/styles/variables.less";

.admin-shell {
  box-sizing: border-box;
  height: 100dvh;
  padding: var(--admin-shell-pad);
  color: var(--admin-text);
  background: var(--admin-shell-bg);
  overflow: hidden;
}

.sidebar-brand {
  display: block;
  flex-shrink: 0;
  min-height: auto;
  height: auto;
  padding: 12px var(--admin-card-pad);
  box-sizing: border-box;
  border-bottom: 1px solid var(--admin-border);
}

.brand-logout {
  display: block;
  width: 100%;
}

.brand-logout :deep(.auth-logout-btn) {
  width: 100%;
  min-height: 46px;
  padding: 10px 14px;
  border-radius: 10px;
  justify-content: center;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  padding: 14px 12px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 13px 14px;
  margin-bottom: 6px;
  border-radius: @radius-lg;
  color: var(--admin-link);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
  transition:
    background @transition-fast,
    color @transition-fast;
}

.nav-item:hover {
  background: var(--admin-nav-hover);
  color: var(--admin-text);
}

.nav-item--active {
  background: var(--admin-nav-active-bg);
  color: var(--admin-text);
  box-shadow: inset 0 0 0 1px var(--admin-nav-active-ring);
}

.nav-group {
  margin-bottom: 6px;
}

.nav-group > .nav-item {
  margin-bottom: 6px;
}

.nav-group--open .nav-group__children {
  display: flex;
}

.nav-group__children {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
}

.nav-group__children .nav-item {
  margin-bottom: 0;
}

.nav-icon {
  width: 26px;
  flex-shrink: 0;
  text-align: center;
  opacity: 0.88;
  font-size: 16px;
  line-height: 1;
}

.muted {
  color: var(--admin-muted);
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.btn {
  border-radius: @radius-md;
  font-size: 13px;
  font-weight: 550;
  padding: 8px 14px;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background @transition-fast,
    border-color @transition-fast,
    color @transition-fast;
}

.btn-ghost {
  color: var(--admin-btn-ghost-fg);
  background: var(--admin-nav-hover);
  border-color: var(--admin-border);
}

.btn-ghost:hover {
  filter: brightness(1.05);
}

.admin-workspace--fill {
  display: flex;
  flex-direction: column;
}
</style>
