import type { H3Event } from 'h3'
import type { RowDataPacket } from 'mysql2'
import { readAuthTokenFromEvent, verifyAuthToken } from './jwt'
import { useMysqlPool } from '../mysql'

export type AuthUser = {
  id: number
  username: string
  displayName: string | null
}

type UserRow = RowDataPacket & {
  id: number
  username: string
  display_name: string | null
}

export async function getAuthUserFromEvent(event: H3Event): Promise<AuthUser | null> {
  const token = readAuthTokenFromEvent(event)
  if (!token) return null

  let payload
  try {
    payload = verifyAuthToken(token)
  } catch {
    return null
  }

  const userId = Number(payload.sub)
  if (!Number.isFinite(userId) || userId < 1) return null

  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) return null

  const pool = useMysqlPool()
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, username, display_name FROM users WHERE id = ? LIMIT 1',
    [userId],
  )
  const row = rows[0]
  if (!row || row.username !== payload.username) return null

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
  }
}

export async function requireAuthUser(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUserFromEvent(event)
  if (!user) {
    throw createError({ statusCode: 401, message: '未登录或会话已过期' })
  }
  return user
}
