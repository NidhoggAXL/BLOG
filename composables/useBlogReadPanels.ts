/** 前台文章阅读页：左侧目录栏 + 右侧大纲/双链栏显隐（layout 与详情页共享） */

const sidebarOpen = ref(true);
const tocRailOpen = ref(true);

export function useBlogReadPanels() {
  const route = useRoute();

  const isBlogLanding = computed(() => route.path === "/blog");

  const isBlogDirBrowse = computed(() => /^\/blog\/dir\/\d+$/.test(route.path));

  const isBlogPostDetail = computed(() => {
    const path = route.path;
    if (path.startsWith("/blog/dir/")) return false;
    return path.startsWith("/blog/") && path.length > "/blog/".length;
  });

  const isBlogReadMode = computed(
    () => isBlogPostDetail.value || isBlogDirBrowse.value,
  );

  /** 前台主内容区统一内边距（侧栏/主卡片间距） */
  const isPublicContentInset = computed(() => {
    if (isBlogLanding.value) return false;
    return isBlogReadMode.value;
  });

  const showPublicSidebar = computed(() => isBlogReadMode.value);

  return {
    sidebarOpen,
    tocRailOpen,
    isBlogLanding,
    isBlogDirBrowse,
    isBlogPostDetail,
    isBlogReadMode,
    isPublicContentInset,
    showPublicSidebar,
  };
}
