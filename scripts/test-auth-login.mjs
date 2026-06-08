/**
 * 快速验证登录 API：node scripts/test-auth-login.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const base = process.env.NUXT_URL || 'http://127.0.0.1:3000'
const username = process.env.TEST_USER || 'admin'
const password = process.env.TEST_PASS || 'admin123'

const pem = fs.readFileSync(path.join(root, '.keys/rsa-public.pem'), 'utf8')
const enc = crypto.publicEncrypt(
  { key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
  Buffer.from(password),
)
const passwordCipher = enc.toString('base64')

const res = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, passwordCipher }),
})
const text = await res.text()
console.log('[test-auth-login] status:', res.status)
console.log('[test-auth-login] body:', text)
if (!res.ok) process.exit(1)
console.log('[test-auth-login] ✓ 登录成功')
