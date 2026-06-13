/** 前台统一刷新：目录树、文章列表、当前文章详情 */
export function usePublicContentRefresh() {
  const { refreshAll } = useBlogContent();
  const refreshing = useState<boolean>("public-content-refreshing", () => false);
  const lastRefreshedAt = useState<number | null>(
    "public-content-last-refresh",
    () => null,
  );

  async function refreshPublicContent(): Promise<void> {
    if (refreshing.value) return;
    const { startTask, stopTask } = useRouteLoading();
    refreshing.value = true;
    startTask();
    try {
      await refreshAll();
      await refreshNuxtData((key) => {
        if (typeof key !== "string") return false;
        return (
          key === "public-posts-list" || key.startsWith("public-post:")
        );
      });
      lastRefreshedAt.value = Date.now();
    } finally {
      refreshing.value = false;
      stopTask();
    }
  }

  return {
    refreshPublicContent,
    refreshing,
    lastRefreshedAt,
  };
}
