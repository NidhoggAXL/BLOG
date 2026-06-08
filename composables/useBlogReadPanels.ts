/** 前台文章阅读页：左侧目录栏 + 右侧大纲/双链栏显隐（layout 与详情页共享） */

const sidebarOpen = ref(true);
const tocRailOpen = ref(true);

export function useBlogReadPanels() {
  const route = useRoute();

  const isBlogPostDetail = computed(() => {
    const path = route.path;
    return path.startsWith("/blog/") && path.length > "/blog/".length;
  });

  /** 前台主内容区统一内边距（顶栏与侧栏/主卡片间距） */
  const isPublicContentInset = computed(() => {
    const path = route.path;
    if (path === "/blog" || path === "/knowledge-graph") return true;
    return isBlogPostDetail.value;
  });

  const isKnowledgeGraphPage = computed(() => route.path === "/knowledge-graph");

  const showPublicSidebar = computed(() => !isKnowledgeGraphPage.value);

  return {
    sidebarOpen,
    tocRailOpen,
    isBlogPostDetail,
    isPublicContentInset,
    isKnowledgeGraphPage,
    showPublicSidebar,
  };
}
