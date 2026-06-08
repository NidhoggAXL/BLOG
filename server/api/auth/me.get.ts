import { getAuthUserFromEvent } from '../../utils/auth/session'

export default defineEventHandler(async (event) => {
  const user = await getAuthUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, message: '未登录或会话已过期' })
  }
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  }
})
