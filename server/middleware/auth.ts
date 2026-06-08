import { getAuthUserFromEvent } from '../utils/auth/session'

const PUBLIC_API_PREFIXES = [
  '/api/public',
  '/api/auth/public-key',
  '/api/auth/login',
  '/api/auth/logout',
] as const

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return

  if (PUBLIC_API_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return
  }

  const user = await getAuthUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, message: '未登录或会话已过期' })
  }

  event.context.authUser = user
})
