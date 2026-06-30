<template>
  <div class="admin-shell">
    <div class="admin-shell__layout">
      <aside class="admin-card admin-sidebar-card" aria-label="功能目录">
        <div class="sidebar-brand">
          <AuthLogoutButton
            variant="sidebar"
            :confirm="true"
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

        <div class="sidebar-footer">
          <button
            type="button"
            class="theme-btn"
            :title="isDark ? '切换为亮色' : '切换为暗色'"
            @click="toggleTheme"
          >
            <span class="theme-icon" aria-hidden="true">{{ isDark ? "☀" : "☾" }}</span>
            <span>{{ isDark ? "亮色模式" : "暗色模式" }}</span>
          </button>
        </div>
      </aside>

      <div class="admin-main">
        <RouteLoadingOverlay />
        <header class="admin-card admin-toolbar-card" aria-label="功能按钮">
          <div class="toolbar-title">{{ title }}</div>
          <div
            v-if="isDashboardPage"
            class="toolbar-center toolbar-center--actions"
          >
            <DashboardWikilinkRebuildButton />
            <DashboardPostTextIndexRebuildButton v-if="aiEnabled" />
          </div>
          <div class="toolbar-actions">
            <NuxtLink to="/" class="btn btn-ghost">查看站点</NuxtLink>
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
const { toggleTheme, isDark } = useAppTheme();

const isDashboardPage = computed(() => route.path === "/admin");
const runtimeConfig = useRuntimeConfig();
const aiEnabled = computed(() => runtimeConfig.public.aiEnabled !== false);

onMounted(() => {
  if (!auth.checked) auth.fetchMe();
});

const menu = [
  { to: "/admin", label: "控制台", icon: "◆" },
  {
    to: "/admin/posts",
    label: "文章管理",
    icon: "▤",
    children: [
      { to: "/admin/posts/directories", label: "目录结构", icon: "▦" },
    ],
  },
  { to: "/admin/profile", label: "个人信息", icon: "◉" },
] as const;

const isPostsSectionRoute = computed(() => {
  const path = route.path;
  return path === "/admin/posts" || path.startsWith("/admin/posts/");
});

/** 需要占满工作区高度的页面（文章列表、图谱等，仅精确路径） */
const fillRoutes = ["/admin/posts"] as const;

/** 长表单/配置页：需在工作区内滚动，不能套用 fill 的 overflow:hidden */
const fillRouteExcludes = [
  "/admin/posts/new",
  "/admin/posts/directories",
  "/admin/posts/import",
  "/admin/posts/edit",
] as const;

const isFillPage = computed(() => {
  const path = route.path;
  if (
    fillRouteExcludes.some((p) => path === p || path.startsWith(`${p}/`))
  ) {
    return false;
  }
  return (fillRoutes as readonly string[]).includes(path);
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
@import "~/assets/styles/admin-directories-page.less";
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
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 14px 12px 12px;
  border-bottom: 1px solid var(--admin-border);
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  padding: 14px 12px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
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

.sidebar-footer {
  flex-shrink: 0;
  padding: 14px 12px;
  border-top: 1px solid var(--admin-border);
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  background: var(--admin-body-bg);
  color: var(--admin-muted);
  font-size: 0.875rem;
  cursor: pointer;
  transition:
    background @transition-fast,
    border-color @transition-fast,
    color @transition-fast;

  &:hover {
    background: var(--admin-nav-hover);
    border-color: var(--admin-muted);
    color: var(--admin-text);
  }
}

.theme-icon {
  font-size: 1rem;
  line-height: 1;
}

.muted {
  color: var(--admin-muted);
}

.toolbar-title {
  justify-self: start;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.toolbar-center {
  justify-self: center;
}

.toolbar-center--actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.toolbar-actions {
  justify-self: end;
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
