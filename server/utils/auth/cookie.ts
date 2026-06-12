import type { H3Event } from 'h3'
import { getAuthCookieName } from './jwt'

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/** 与 setCookie / deleteCookie 必须使用相同选项，否则浏览器无法清除会话 */
export function getAuthCookieOptions(event?: H3Event) {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const secure = config.authCookieSecure !== false && config.authCookieSecure !== 'false'
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: Boolean(secure),
    path: '/',
  }
}

export function setAuthCookie(event: H3Event, token: string) {
  const name = getAuthCookieName(event)
  setCookie(event, name, token, {
    ...getAuthCookieOptions(event),
    maxAge: AUTH_COOKIE_MAX_AGE,
  })
}

export function clearAuthCookie(event: H3Event) {
  const name = getAuthCookieName(event)
  const opts = getAuthCookieOptions(event)
  const expired = new Date(0)
  deleteCookie(event, name, { ...opts, expires: expired, maxAge: 0 })
  setCookie(event, name, '', { ...opts, maxAge: 0, expires: expired })
}
