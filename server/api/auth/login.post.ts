import type { RowDataPacket } from 'mysql2'
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

  const body = await readBody<{
    username?: string
    passwordCipher?: string
  }>(event)

  const username = String(body.username ?? '').trim()
  if (!username) {
    throw createError({ statusCode: 400, message: '请输入用户名' })
  }

  const plainPassword = decryptPasswordCipher(body.passwordCipher ?? '')
  if (!plainPassword) {
    throw createError({ statusCode: 400, message: '请输入密码' })
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
