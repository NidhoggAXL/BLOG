export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

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
    // 已有登录态时直接放行，避免路由切换（如点击“编辑”）时重复请求 me 导致误重定向
    if (auth.user) return

    // 仅在未校验过时请求一次 me；若已明确未登录则直接跳转登录页
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
})
