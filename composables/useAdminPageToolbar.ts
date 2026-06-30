export type AdminPageToolbarConfig = {
  subtitle?: string
  hideActions?: boolean
  loading?: boolean
}

/** 文章列表顶栏 SSR 默认值（layout 在 page setup 之前渲染，需在此合并） */
export const ADMIN_POSTS_LIST_TOOLBAR_DEFAULT: AdminPageToolbarConfig = {
  subtitle: '按目录浏览、筛选与批量编辑文章',
  hideActions: false,
  loading: false,
}

export function mergeAdminPageToolbar(
  path: string,
  config: AdminPageToolbarConfig | null,
): AdminPageToolbarConfig | null {
  if (path === '/admin/posts') {
    return { ...ADMIN_POSTS_LIST_TOOLBAR_DEFAULT, ...(config ?? {}) }
  }
  return config
}

/** 不可序列化，勿放入 useState */
const toolbarRefreshHandler = shallowRef<
  (() => void | Promise<void>) | null
>(null)

/** 页面级顶栏扩展（副标题、操作回调等），由 layout 读取渲染 */
export function useAdminPageToolbar() {
  const toolbarConfig = useState<AdminPageToolbarConfig | null>(
    'admin-page-toolbar',
    () => null,
  )

  function setToolbarConfig(
    config: AdminPageToolbarConfig | null,
    onRefresh?: (() => void | Promise<void>) | null,
  ) {
    toolbarConfig.value = config
    toolbarRefreshHandler.value = onRefresh ?? null
  }

  function runToolbarRefresh() {
    void toolbarRefreshHandler.value?.()
  }

  return {
    toolbarConfig: readonly(toolbarConfig),
    setToolbarConfig,
    runToolbarRefresh,
  }
}
