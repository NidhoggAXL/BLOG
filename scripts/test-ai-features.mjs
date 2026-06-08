/**
 * AI 功能模拟测试（需 MySQL + Ollama + post_embeddings 表 + dev 服务）
 * 用法: node scripts/test-ai-features.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const BASE = process.env.NUXT_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:3000'
const MYSQL = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'blog',
}

async function login() {
  const pem = fs.readFileSync(path.join(root, '.keys/rsa-public.pem'), 'utf8')
  const password = process.env.TEST_PASS || 'admin123'
  const enc = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(password),
  )
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.TEST_USER || 'admin',
      passwordCipher: enc.toString('base64'),
    }),
  })
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`)
  const setCookie = res.headers.get('set-cookie') || ''
  const m = setCookie.match(/blog_auth=[^;]+/)
  if (!m) throw new Error('no auth cookie')
  return m[0]
}

async function testOllama() {
  const url = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  const res = await fetch(`${url}/api/tags`)
  if (!res.ok) throw new Error(`Ollama tags ${res.status}`)
  const data = await res.json()
  const names = (data.models || []).map((m) => m.name)
  console.log('✓ Ollama 可达，模型:', names.slice(0, 5).join(', ') || '(空)')
}

async function testEmbeddingsTable() {
  const pool = mysql.createPool(MYSQL)
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'post_embeddings'`,
  )
  await pool.end()
  if (!rows[0]?.c) throw new Error('post_embeddings 表不存在')
  console.log('✓ post_embeddings 表存在')
}

async function testWikilinkSuggest(cookie) {
  const res = await fetch(`${BASE}/api/ai/wikilink-suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      title: '测试文章',
      body: '本文介绍 Nuxt 3 全栈开发与 JWT 认证实践。',
      exclude_slugs: ['test-slug'],
      existing_slugs: [],
      max_suggestions: 3,
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`wikilink-suggest ${res.status}: ${text}`)
  const data = JSON.parse(text)
  if (!Array.isArray(data.suggestions)) throw new Error('suggestions 非数组')
  console.log('✓ wikilink-suggest', data.suggestions.length, '条推荐')
}

async function testPublicChatSSE() {
  const res = await fetch(`${BASE}/api/public/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '知识库里有什么内容？' }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`public chat ${res.status}: ${t}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('no stream body')
  const decoder = new TextDecoder()
  let gotEvent = false
  let buffer = ''
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    if (buffer.includes('event:')) gotEvent = true
    if (buffer.includes('event: done') || buffer.includes('event:error')) break
  }
  if (!gotEvent) throw new Error('SSE 无 event')
  console.log('✓ public RAG SSE 流式响应正常')
}

async function main() {
  console.log('AI 功能测试 @', BASE)
  await testOllama()
  await testEmbeddingsTable()
  const cookie = await login()
  console.log('✓ 登录成功')
  await testWikilinkSuggest(cookie)
  await testPublicChatSSE()
  console.log('\n全部通过')
}

main().catch((e) => {
  console.error('✗', e.message || e)
  process.exit(1)
})
