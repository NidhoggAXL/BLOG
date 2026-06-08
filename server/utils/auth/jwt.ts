import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import { getJwtPrivatePem, getJwtPublicPem } from './keys'

export type AuthTokenPayload = {
  sub: string
  username: string
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const config = useRuntimeConfig()
  return jwt.sign(payload, getJwtPrivatePem(), {
    algorithm: 'RS256',
    expiresIn: config.authJwtExpiresIn,
  })
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtPublicPem(), {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload & AuthTokenPayload

    if (!decoded.sub || !decoded.username) {
      throw new Error('invalid payload')
    }

    return {
      sub: String(decoded.sub),
      username: String(decoded.username),
    }
  } catch {
    throw createError({ statusCode: 401, message: '未登录或会话已过期' })
  }
}

export function getAuthCookieName(event?: H3Event): string {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  return config.authCookieName
}

export function readAuthTokenFromEvent(event: H3Event): string | null {
  const name = getAuthCookieName(event)
  const token = getCookie(event, name)
  return token?.trim() || null
}
