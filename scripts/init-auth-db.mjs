/**
 * 在本地 MySQL 创建 users 表（与 server bootstrap 一致）
 * 用法：node scripts/init-auth-db.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnv()

const host = process.env.MYSQL_HOST || '127.0.0.1'
const port = Number(process.env.MYSQL_PORT || 3306)
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || ''
const database = process.env.MYSQL_DATABASE || ''

if (!database) {
  console.error('[init-auth-db] 请在 .env 中设置 MYSQL_DATABASE')
  process.exit(1)
}

const sqlPath = path.join(root, 'db', '08-schema-users.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')
const ddl = sql
  .split('\n')
  .filter((l) => !l.trim().startsWith('--') && !l.trim().startsWith('SET '))
  .join('\n')
  .trim()

const conn = await mysql.createConnection({ host, port, user, password, database })
try {
  await conn.query(ddl)
  console.log('[init-auth-db] ✓ users 表已就绪（CREATE TABLE IF NOT EXISTS）')
} finally {
  await conn.end()
}
