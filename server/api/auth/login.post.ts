import type { RowDataPacket } from 'mysql2'
import { getClientIp } from '../../utils/ai/rate-limit'
import { checkLoginRateLimit } from '../../utils/auth/rate-limit'
import { decryptPasswordCipher } from '../../utils/auth/rsa'
import { verifyPassword } from '../../utils/auth/password'
import { signAuthToken } from '../../utils/auth/jwt'
import { setAuthCookie } from '../../utils/auth/cookie'
import { useMysqlPool } from '../../utils/mysql'

type UserRow = RowDataPacket & {
  id: number
  username: string
  password_hash: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const ip = getClientIp(event)
  const limitPerMin = Number(config.authLoginRateLimitPerMin || 10)
  if (!checkLoginRateLimit(ip, limitPerMin)) {
    throw createError({ statusCode: 429, message: '登录尝试过于频繁，请稍后再试' })
  }

  const body = await readBody<{
    username?: string
    passwordCipher?: string
    password?: string
  }>(event)

  const username = String(body.username ?? '').trim()
  if (!username) {
    throw createError({ statusCode: 400, message: '请输入用户名' })
  }

  let plainPassword: string
  if (body.passwordCipher) {
    plainPassword = decryptPasswordCipher(body.passwordCipher)
  } else if (config.authAllowPlainPassword) {
    plainPassword = String(body.password ?? '')
    if (!plainPassword) {
      throw createError({ statusCode: 400, message: '请输入密码' })
    }
  } else {
    throw createError({
      statusCode: 400,
      message: '当前环境需要 HTTPS 登录，或未启用明文密码',
    })
  }

  const pool = useMysqlPool()
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1',
    [username],
  )
  const user = rows[0]

  const ok = user && (await verifyPassword(plainPassword, user.password_hash))
  if (!ok) {
    throw createError({ statusCode: 401, message: '用户名或密码错误' })
  }

  await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [
    user!.id,
  ])

  const token = signAuthToken({
    sub: String(user!.id),
    username: user!.username,
  })

  setAuthCookie(event, token)

  return {
    ok: true,
    user: {
      id: user!.id,
      username: user!.username,
    },
  }
})
