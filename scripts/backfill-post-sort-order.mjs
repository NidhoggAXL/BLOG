/**
 * 从 slug 末段回填 posts.sort_order（Obsidian 01_ 前缀）
 *
 * 用法：node scripts/backfill-post-sort-order.mjs
 * 需已执行 db/06-schema-posts-sort-order.sql
 */

import mysql from 'mysql2/promise'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const path = resolve(root, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function postSortOrderFromStem(stem) {
  const m = stem.trim().match(/^(\d+)/)
  if (!m?.[1]) return null
  const n = Number.parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

loadEnv()

const host = process.env.MYSQL_HOST || '127.0.0.1'
const port = Number(process.env.MYSQL_PORT || 3306)
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || ''
const database = process.env.MYSQL_DATABASE

if (!database) {
  console.error('请在 .env 中配置 MYSQL_DATABASE')
  process.exit(1)
}

const pool = mysql.createPool({ host, port, user, password, database })

try {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'sort_order'`,
    [database],
  )
  if (!(cols.length > 0)) {
    console.error('posts.sort_order 不存在，请先执行 db/06-schema-posts-sort-order.sql')
    process.exit(1)
  }

  const [rows] = await pool.query('SELECT id, slug FROM posts')
  let updated = 0
  for (const row of rows) {
    const stem = String(row.slug).split('/').pop() ?? row.slug
    const sort_order = postSortOrderFromStem(stem)
    const [res] = await pool.query('UPDATE posts SET sort_order = ? WHERE id = ?', [
      sort_order,
      row.id,
    ])
    if (res.affectedRows) updated++
  }
  console.log(`backfill-post-sort-order: 已处理 ${rows.length} 篇，更新 ${updated} 篇`)
} finally {
  await pool.end()
}
