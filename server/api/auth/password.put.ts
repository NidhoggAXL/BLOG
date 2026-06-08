import type { RowDataPacket } from 'mysql2'
import { hashPassword, verifyPassword } from '../../utils/auth/password'
import { requireAuthUser } from '../../utils/auth/session'

type PasswordPayload = {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

type PasswordRow = RowDataPacket & { password_hash: string }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const authUser = await requireAuthUser(event)
  const body = await readBody<PasswordPayload>(event)
  const currentPassword = String(body.currentPassword ?? '')
  const newPassword = String(body.newPassword ?? '')
  const confirmPassword = String(body.confirmPassword ?? '')

  if (!currentPassword) {
    throw createError({ statusCode: 400, message: '请输入旧密码' })
  }
  if (!newPassword) {
    throw createError({ statusCode: 400, message: '请输入新密码' })
  }
  if (newPassword.length < 8) {
    throw createError({ statusCode: 400, message: '新密码至少 8 位' })
  }
  if (newPassword.length > 128) {
    throw createError({ statusCode: 400, message: '新密码过长' })
  }
  if (newPassword !== confirmPassword) {
    throw createError({ statusCode: 400, message: '两次输入的新密码不一致' })
  }
  if (newPassword === currentPassword) {
    throw createError({ statusCode: 400, message: '新密码不能与旧密码相同' })
  }

  const pool = useMysqlPool()
  const [rows] = await pool.query<PasswordRow[]>(
    'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
    [authUser.id],
  )
  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  const ok = await verifyPassword(currentPassword, row.password_hash)
  if (!ok) {
    throw createError({ statusCode: 401, message: '旧密码不正确' })
  }

  const passwordHash = await hashPassword(newPassword)
  await pool.query(
    `UPDATE users
     SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [passwordHash, authUser.id],
  )

  return { ok: true }
})
