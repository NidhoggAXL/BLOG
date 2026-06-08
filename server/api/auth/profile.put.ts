import type { ResultSetHeader } from 'mysql2'
import { requireAuthUser } from '../../utils/auth/session'

type ProfilePayload = {
  displayName?: string | null
  email?: string | null
  bio?: string | null
  avatarUrl?: string | null
  githubUrl?: string | null
  giteeUrl?: string | null
  websiteUrl?: string | null
}

function normalizeNullableText(raw: unknown, maxLen: number, label: string): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (s.length > maxLen) {
    throw createError({ statusCode: 400, message: `${label} 不能超过 ${maxLen} 个字符` })
  }
  return s
}

function normalizeUrl(raw: unknown, label: string): string | null {
  const v = normalizeNullableText(raw, 500, label)
  if (!v) return null
  let parsed: URL
  try {
    parsed = new URL(v)
  } catch {
    throw createError({ statusCode: 400, message: `${label} 不是合法 URL` })
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, message: `${label} 仅支持 http/https` })
  }
  return v
}

function normalizeEmail(raw: unknown): string | null {
  const email = normalizeNullableText(raw, 191, '邮箱')
  if (!email) return null
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!ok) {
    throw createError({ statusCode: 400, message: '邮箱格式不正确' })
  }
  return email
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const authUser = await requireAuthUser(event)
  const body = await readBody<ProfilePayload>(event)

  const displayName = normalizeNullableText(body.displayName, 255, '昵称')
  const email = normalizeEmail(body.email)
  const bio = normalizeNullableText(body.bio, 2000, '简介')
  const avatarUrl = normalizeUrl(body.avatarUrl, '头像地址')
  const githubUrl = normalizeUrl(body.githubUrl, 'GitHub')
  const giteeUrl = normalizeUrl(body.giteeUrl, 'Gitee')
  const websiteUrl = normalizeUrl(body.websiteUrl, '个人站')

  const pool = useMysqlPool()
  try {
    await pool.query<ResultSetHeader>(
      `UPDATE users
       SET display_name = ?, email = ?, bio = ?, avatar_url = ?, github_url = ?, gitee_url = ?, website_url = ?
       WHERE id = ?`,
      [displayName, email, bio, avatarUrl, githubUrl, giteeUrl, websiteUrl, authUser.id],
    )
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number }
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      throw createError({ statusCode: 409, message: '邮箱已被占用' })
    }
    throw e
  }

  const [rows] = await pool.query<Array<{ updated_at: string }>>(
    'SELECT updated_at FROM users WHERE id = ? LIMIT 1',
    [authUser.id],
  )

  return {
    ok: true,
    profile: {
      id: authUser.id,
      username: authUser.username,
      displayName,
      email,
      bio,
      avatarUrl,
      githubUrl,
      giteeUrl,
      websiteUrl,
      updatedAt: rows[0]?.updated_at ?? null,
    },
  }
})
