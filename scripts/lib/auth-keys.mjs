/**
 * 生成/确保 RSA 传输密钥与 JWT RS256 密钥对（PEM）
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const KEY_FILES = {
  rsaPrivate: 'rsa-private.pem',
  rsaPublic: 'rsa-public.pem',
  jwtPrivate: 'jwt-private.pem',
  jwtPublic: 'jwt-public.pem',
}

/**
 * @param {string} projectRoot 项目根目录
 * @returns {{ created: string[], skipped: string[] }}
 */
export function ensureAuthKeys(projectRoot) {
  const keysDir = path.join(projectRoot, '.keys')
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true })
  }

  const created = []
  const skipped = []

  const pairs = [
    { private: KEY_FILES.rsaPrivate, public: KEY_FILES.rsaPublic, label: 'RSA 传输' },
    { private: KEY_FILES.jwtPrivate, public: KEY_FILES.jwtPublic, label: 'JWT RS256' },
  ]

  for (const pair of pairs) {
    const privPath = path.join(keysDir, pair.private)
    const pubPath = path.join(keysDir, pair.public)
    if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
      skipped.push(pair.label)
      continue
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    fs.writeFileSync(privPath, privateKey, { mode: 0o600 })
    fs.writeFileSync(pubPath, publicKey, { mode: 0o644 })
    created.push(pair.label)
  }

  return { created, skipped }
}
