/**
 * AI 逻辑与 API 冒烟测试（不依赖 embedding 模型下载完成）
 * 用法: NUXT_URL=http://localhost:3001 node scripts/test-ai-smoke.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const BASE = process.env.NUXT_URL || 'http://localhost:3001'
const MYSQL = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'blog',
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~#>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function chunkPostText(title, body) {
  const plain = stripMarkdown(body)
  const full = `${title.trim()}\n\n${plain}`.trim()
  const CHUNK_SIZE = 700
  const CHUNK_OVERLAP = 80
  if (!full) return []
  if (full.length <= CHUNK_SIZE) return [full]
  const chunks = []
  let start = 0
  while (start < full.length) {
    const end = Math.min(start + CHUNK_SIZE, full.length)
    chunks.push(full.slice(start, end).trim())
    if (end >= full.length) break
    start = Math.max(0, end - CHUNK_OVERLAP)
  }
  return chunks.filter(Boolean)
}

async function testChunking() {
  const chunks = chunkPostText('标题', '# Hello\n\n' + 'x'.repeat(1000))
  assert(chunks.length >= 2, '长文应切成多块')
  assert(chunks[0] && chunks[0].includes('标题'), '首块应含标题')
  console.log('✓ 分块逻辑', chunks.length, '块')
}

async function testDbSchema() {
  const pool = mysql.createPool(MYSQL)
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'post_embeddings'`,
  )
  await pool.end()
  assert(rows[0]?.c === 1, 'post_embeddings 表不存在')
  console.log('✓ post_embeddings 表')
}

async function testPublicChatValidation() {
  const res = await fetch(`${BASE}/api/public/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '' }),
  })
  assert(res.status === 400, `空问题应 400，实际 ${res.status}`)
  console.log('✓ 公开 RAG 参数校验')
}

async function testPublicChatSSE() {
  const res = await fetch(`${BASE}/api/public/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '你好' }),
  })
  assert(res.ok, `SSE 应 200，实际 ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  assert(ct.includes('text/event-stream'), `Content-Type 应为 SSE: ${ct}`)
  const text = await res.text()
  assert(text.includes('event:'), '响应应含 SSE event')
  assert(text.includes('event: done') || text.includes('event:error'), '应有 done 或 error')
  console.log('✓ 公开 RAG SSE 协议')
}

async function testWikilinkAuthRequired() {
  const res = await fetch(`${BASE}/api/ai/wikilink-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 't', body: 'b' }),
  })
  assert(res.status === 401, `双链 API 未登录应 401，实际 ${res.status}`)
  console.log('✓ 双链建议需 JWT')
}

async function testWikilinkWithAuth() {
  const pem = fs.readFileSync(path.join(root, '.keys/rsa-public.pem'), 'utf8')
  const password = process.env.TEST_PASS || 'admin123'
  const enc = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(password),
  )
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.TEST_USER || 'admin',
      passwordCipher: enc.toString('base64'),
    }),
  })
  if (!loginRes.ok) {
    console.log('⊘ 跳过双链 API 集成（登录失败，请设置 TEST_PASS）')
    return
  }
  const cookie = (loginRes.headers.get('set-cookie') || '').match(/blog_auth=[^;]+/)?.[0]
  assert(cookie, '应有 cookie')
  const res = await fetch(`${BASE}/api/ai/wikilink-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      title: 'Nuxt 测试',
      body: '关于 JWT 与全栈开发的内容。',
      exclude_slugs: [],
      existing_slugs: [],
      max_suggestions: 3,
    }),
  })
  const body = await res.json()
  if (res.status === 503 && String(body.message || '').includes('Ollama')) {
    console.log('⊘ 双链 API 503（Ollama/embed 未就绪），逻辑路径正确')
    return
  }
  assert(res.ok, `wikilink ${res.status}: ${JSON.stringify(body)}`)
  assert(Array.isArray(body.suggestions), '应返回 suggestions 数组')
  console.log('✓ 双链建议 API', body.suggestions.length, '条')
}

async function testOllamaReachable() {
  const url = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
  const res = await fetch(`${url}/api/tags`)
  assert(res.ok, 'Ollama 不可达')
  const data = await res.json()
  const names = (data.models || []).map((m) => m.name)
  console.log('✓ Ollama 可达:', names.join(', ') || '(无模型)')
  if (!names.some((n) => n.includes('embed') || n.includes('nomic'))) {
    console.log('  ⚠ 尚未检测到 embedding 模型，请执行: ollama pull nomic-embed-text')
  }
}

async function main() {
  console.log('AI 冒烟测试 @', BASE)
  await testChunking()
  await testDbSchema()
  await testOllamaReachable()
  await testPublicChatValidation()
  await testPublicChatSSE()
  await testWikilinkAuthRequired()
  await testWikilinkWithAuth()
  console.log('\n冒烟测试通过')
}

main().catch((e) => {
  console.error('✗', e.message || e)
  process.exit(1)
})
