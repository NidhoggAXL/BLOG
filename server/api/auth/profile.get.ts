import type { RowDataPacket } from 'mysql2'
import { requireAuthUser } from '../../utils/auth/session'

type UserProfileRow = RowDataPacket & {
  id: number
  username: string
  display_name: string | null
  email: string | null
  bio: string | null
  avatar_url: string | null
  github_url: string | null
  gitee_url: string | null
  website_url: string | null
  updated_at: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const authUser = await requireAuthUser(event)
  const pool = useMysqlPool()
  const [rows] = await pool.query<UserProfileRow[]>(
    `SELECT id, username, display_name, email, bio, avatar_url, github_url, gitee_url, website_url, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [authUser.id],
  )
  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 404, message: '用户不存在' })
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    githubUrl: row.github_url,
    giteeUrl: row.gitee_url,
    websiteUrl: row.website_url,
    updatedAt: row.updated_at,
  }
})
