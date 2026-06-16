/** 前台文章阅读页：左侧目录栏 + 右侧大纲/双链栏显隐（layout 与详情页共享） */

const MOBILE_MAX = 767;
const TABLET_MAX = 1023;
const TABLET_MIN_MAIN_WIDTH = 360;

const sidebarOpen = ref(false);
const tocRailOpen = ref(false);
const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);
/** 挂载并完成视口同步后为 true，避免 SSR/hydration 与客户端 DOM 不一致 */
const viewportReady = ref(false);

let panelDefaultsApplied = false;
let viewportListenersAttached = false;

function readBreakpoint(): "mobile" | "tablet" | "desktop" {
  if (import.meta.client) {
    const w = window.innerWidth;
    if (w <= MOBILE_MAX) return "mobile";
    if (w <= TABLET_MAX) return "tablet";
  }
  return "desktop";
}

function syncBreakpointFlags() {
  const bp = readBreakpoint();
  isMobile.value = bp === "mobile";
  isTablet.value = bp === "tablet";
  isDesktop.value = bp === "desktop";
}

function applyPanelDefaultsForBreakpoint() {
  if (isMobile.value) {
    sidebarOpen.value = false;
    tocRailOpen.value = false;
  } else if (isTablet.value) {
    sidebarOpen.value = true;
    tocRailOpen.value = false;
  } else {
    sidebarOpen.value = true;
    tocRailOpen.value = true;
  }
}

function enforceTabletMainWidth() {
  if (!import.meta.client || !isTablet.value) return;
  if (!sidebarOpen.value || !tocRailOpen.value) return;

  const panelWidth = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--read-side-panel-width",
    ),
  );
  const sidebarW = Number.isFinite(panelWidth) ? panelWidth : 240;
  const tocW = sidebarW;
  const rootStyle = getComputedStyle(document.documentElement);
  const gap =
    parseFloat(rootStyle.getPropertyValue("--layout-gap")) * 2 +
    parseFloat(rootStyle.getPropertyValue("--content-gap") || "0");
  const inset = 40;
  const mainW = window.innerWidth - sidebarW - tocW - gap - inset;

  if (mainW < TABLET_MIN_MAIN_WIDTH) {
    tocRailOpen.value = false;
  }
}

function enforceMobileExclusion() {
  if (!isMobile.value) return;
  if (sidebarOpen.value && tocRailOpen.value) {
    tocRailOpen.value = false;
  }
}

function enforcePanelConstraints() {
  enforceMobileExclusion();
  enforceTabletMainWidth();
}

function toggleSidebar() {
  const next = !sidebarOpen.value;
  if (next && isMobile.value && tocRailOpen.value) {
    tocRailOpen.value = false;
  }
  sidebarOpen.value = next;
  enforcePanelConstraints();
}

function toggleTocRail() {
  const next = !tocRailOpen.value;
  if (next && isMobile.value && sidebarOpen.value) {
    sidebarOpen.value = false;
  }
  tocRailOpen.value = next;
  enforcePanelConstraints();
}

function blurSidebarFocus() {
  if (!import.meta.client) return;
  const el = document.activeElement;
  if (el instanceof HTMLElement && el.closest(".sidebar")) {
    el.blur();
  }
}

function closeAllPanels() {
  sidebarOpen.value = false;
  tocRailOpen.value = false;
  blurSidebarFocus();
}

function onViewportChange() {
  const wasMobile = isMobile.value;
  syncBreakpointFlags();
  if (isMobile.value) {
    enforceMobileExclusion();
    if (!wasMobile && isMobile.value) {
      sidebarOpen.value = false;
      tocRailOpen.value = false;
    }
  } else if (wasMobile && !isMobile.value) {
    applyPanelDefaultsForBreakpoint();
  } else {
    enforceTabletMainWidth();
  }
}

function setupViewportListeners() {
  if (!import.meta.client || viewportListenersAttached) return;
  viewportListenersAttached = true;
  window.addEventListener("resize", onViewportChange, { passive: true });
}

function initPanelStateOnClient() {
  syncBreakpointFlags();
  if (!panelDefaultsApplied) {
    applyPanelDefaultsForBreakpoint();
    panelDefaultsApplied = true;
  }
  viewportReady.value = true;
}

export function useBlogReadPanels() {
  const route = useRoute();

  if (import.meta.client) {
    onMounted(() => {
      initPanelStateOnClient();
      setupViewportListeners();
    });
  }

  /** 仅客户端挂载后反映真实视口，模板中影响 DOM 结构处应使用此项 */
  const isMobileViewport = computed(
    () => viewportReady.value && isMobile.value,
  );

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

  const hasReadOverlayOpen = computed(
    () =>
      isBlogReadMode.value &&
      isMobileViewport.value &&
      (sidebarOpen.value || tocRailOpen.value),
  );

  return {
    sidebarOpen,
    tocRailOpen,
    isMobile,
    isMobileViewport,
    isTablet,
    isDesktop,
    viewportReady,
    isBlogLanding,
    isBlogDirBrowse,
    isBlogPostDetail,
    isBlogReadMode,
    isPublicContentInset,
    showPublicSidebar,
    hasReadOverlayOpen,
    toggleSidebar,
    toggleTocRail,
    closeAllPanels,
  };
}
