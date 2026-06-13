export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuthStore()
  const { startTask, stopTask } = useRouteLoading()
  const needsAuthCheck =
    to.path === '/login' ||
    to.path === '/admin' ||
    to.path.startsWith('/admin/')

  if (import.meta.client && needsAuthCheck) {
    startTask()
  }

  try {
  if (to.path === '/login') {
    // 刚退出：跳过 fetchMe，避免 Cookie 尚未从浏览器移除时被判定为仍登录并跳回后台
    if (to.query.loggedOut === '1') {
      auth.user = null
      auth.checked = true
      return
    }
    if (!auth.checked) {
      await auth.fetchMe()
    }
    if (auth.user) {
      const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/admin'
      return navigateTo(redirect.startsWith('/') ? redirect : '/admin')
    }
    return
  }

  if (to.path === '/admin' || to.path.startsWith('/admin/')) {
    const enteringFromOutsideAdmin =
      import.meta.client && !from.path.startsWith('/admin')

    // 从公开页进入后台时重新校验，避免 Pinia 中过期的登录态误放行
    if (auth.user && enteringFromOutsideAdmin) {
      await auth.fetchMe()
    }

    if (auth.user) return

    if (!auth.checked) {
      await auth.fetchMe()
    }
    if (!auth.user) {
      return navigateTo({
        path: '/login',
        query: { redirect: to.fullPath },
      })
    }
  }
  } finally {
    if (import.meta.client && needsAuthCheck) {
      stopTask()
    }
  }
})
