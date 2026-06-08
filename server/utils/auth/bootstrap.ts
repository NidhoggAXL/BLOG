import type { RowDataPacket } from 'mysql2'
import { hashPassword } from './password'
import { useMysqlPool } from '../mysql'

const USERS_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt',
  display_name VARCHAR(255) NULL DEFAULT NULL,
  email VARCHAR(191) NULL DEFAULT NULL,
  bio TEXT NULL,
  avatar_url VARCHAR(500) NULL DEFAULT NULL,
  github_url VARCHAR(500) NULL DEFAULT NULL,
  gitee_url VARCHAR(500) NULL DEFAULT NULL,
  website_url VARCHAR(500) NULL DEFAULT NULL,
  last_login_at DATETIME(3) NULL DEFAULT NULL,
  password_changed_at DATETIME(3) NULL DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`

type CountRow = RowDataPacket & { cnt: number }
type ExistsRow = RowDataPacket & { cnt: number }

let bootstrapDone = false

async function usersColumnExists(pool: ReturnType<typeof useMysqlPool>, columnName: string): Promise<boolean> {
  const [rows] = await pool.query<ExistsRow[]>(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = ?`,
    [columnName],
  )
  return Number(rows[0]?.cnt ?? 0) > 0
}

async function usersIndexExists(pool: ReturnType<typeof useMysqlPool>, indexName: string): Promise<boolean> {
  const [rows] = await pool.query<ExistsRow[]>(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = ?`,
    [indexName],
  )
  return Number(rows[0]?.cnt ?? 0) > 0
}

/** 确保 users 表存在；表为空时按 runtimeConfig 创建首个管理员 */
export async function ensureAuthBootstrap(): Promise<void> {
  if (bootstrapDone) return

  const config = useRuntimeConfig()
  if (!config.mysqlDatabase) {
    console.warn('[auth] 未配置 MYSQL_DATABASE，跳过用户 bootstrap')
    bootstrapDone = true
    return
  }

  const pool = useMysqlPool()
  await pool.query(USERS_DDL)
  if (!(await usersColumnExists(pool, 'email'))) {
    await pool.query('ALTER TABLE users ADD COLUMN email VARCHAR(191) NULL DEFAULT NULL AFTER display_name')
  }
  if (!(await usersColumnExists(pool, 'bio'))) {
    await pool.query('ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER email')
  }
  if (!(await usersColumnExists(pool, 'avatar_url'))) {
    await pool.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL DEFAULT NULL AFTER bio')
  }
  if (!(await usersColumnExists(pool, 'github_url'))) {
    await pool.query('ALTER TABLE users ADD COLUMN github_url VARCHAR(500) NULL DEFAULT NULL AFTER avatar_url')
  }
  if (!(await usersColumnExists(pool, 'gitee_url'))) {
    await pool.query('ALTER TABLE users ADD COLUMN gitee_url VARCHAR(500) NULL DEFAULT NULL AFTER github_url')
  }
  if (!(await usersColumnExists(pool, 'website_url'))) {
    await pool.query('ALTER TABLE users ADD COLUMN website_url VARCHAR(500) NULL DEFAULT NULL AFTER gitee_url')
  }
  if (!(await usersColumnExists(pool, 'password_changed_at'))) {
    await pool.query('ALTER TABLE users ADD COLUMN password_changed_at DATETIME(3) NULL DEFAULT NULL AFTER last_login_at')
  }
  if (!(await usersIndexExists(pool, 'uk_users_email'))) {
    await pool.query('ALTER TABLE users ADD UNIQUE KEY uk_users_email (email)')
  }

  const [countRows] = await pool.query<CountRow[]>(
    'SELECT COUNT(*) AS cnt FROM users',
  )
  const cnt = Number(countRows[0]?.cnt ?? 0)
  if (cnt > 0) {
    bootstrapDone = true
    return
  }

  const username = String(config.authBootstrapUsername || 'admin').trim()
  const password = String(config.authBootstrapPassword || 'admin123')
  if (!username) {
    console.warn('[auth] AUTH_BOOTSTRAP_USERNAME 为空，跳过创建管理员')
    bootstrapDone = true
    return
  }

  const passwordHash = await hashPassword(password)
  await pool.query(
    'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)',
    [username, passwordHash, '管理员'],
  )
  console.info(`[auth] 已创建初始管理员: ${username}（请尽快修改密码）`)
  bootstrapDone = true
}
