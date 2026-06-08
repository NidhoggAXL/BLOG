/**
 * 生成认证密钥：npm run auth:keys
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureAuthKeys } from './lib/auth-keys.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const { created, skipped } = ensureAuthKeys(root)

if (created.length) {
  console.log('[auth:keys] 已生成:', created.join(', '))
  console.log('[auth:keys] 目录:', path.join(root, '.keys'))
} else {
  console.log('[auth:keys] 密钥已存在，跳过:', skipped.join(', ') || '(无)')
}
