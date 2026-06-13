/**
 * 一次性将 posts.title 更新为去掉 Obsidian 排序前缀后的展示名（slug 不变）。
 * 运行：node --experimental-strip-types scripts/strip-post-titles-prefix.mjs
 * 加 --dry-run 仅预览不写库。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { formatPublicDisplayName } from '../utils/obsidianDisplayPrefix.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')

function loadDotEnv() {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) {
    console.error('未找到 .env')
    process.exit(1)
  }
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!(k in process.env)) process.env[k] = v
  }
}

function uniqueTitle(base, used) {
  const keyOf = (s) => s.toLowerCase()
  let s = base.slice(0, 191) || '未命名'
  if (!used.has(keyOf(s))) {
    used.add(keyOf(s))
    return s
  }
  let i = 2
  while (i < 10000) {
    const candidate = `${base.slice(0, 180)}-${i}`.slice(0, 191)
    if (!used.has(keyOf(candidate))) {
      used.add(keyOf(candidate))
      return candidate
    }
    i++
  }
  return `post-${Date.now()}`.slice(0, 191)
}

loadDotEnv()

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE,
})

const [rows] = await pool.query('SELECT id, slug, title FROM posts ORDER BY id')
const usedTitles = new Set()
const updates = []

for (const post of rows) {
  const nextBase = formatPublicDisplayName(post.title?.trim() || post.slug, post.slug)
  if (nextBase === post.title) {
    usedTitles.add(post.title.toLowerCase())
    continue
  }
  const nextTitle = uniqueTitle(nextBase, usedTitles)
  updates.push({ id: post.id, slug: post.slug, from: post.title, to: nextTitle })
}

if (!updates.length) {
  console.log('无需更新：所有 title 已是展示名或无变化。')
  await pool.end()
  process.exit(0)
}

console.log(`${dryRun ? '[dry-run] ' : ''}将更新 ${updates.length} 篇：`)
for (const u of updates.slice(0, 20)) {
  console.log(`  #${u.id} ${u.slug}: 「${u.from}」→「${u.to}」`)
}
if (updates.length > 20) {
  console.log(`  … 另有 ${updates.length - 20} 篇`)
}

if (!dryRun) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const u of updates) {
      await conn.query('UPDATE posts SET title = ? WHERE id = ?', [u.to, u.id])
    }
    await conn.commit()
    console.log('完成。')
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

await pool.end()
