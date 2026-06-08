import { clearAuthCookie } from '../../utils/auth/cookie'

export default defineEventHandler((event) => {
  clearAuthCookie(event)
  return { ok: true }
})
