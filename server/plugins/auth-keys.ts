import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export default defineNitroPlugin(async () => {
  const root = process.cwd()
  const libUrl = pathToFileURL(
    path.join(root, 'scripts', 'lib', 'auth-keys.mjs'),
  ).href
  const { ensureAuthKeys } = await import(libUrl)
  const { created } = ensureAuthKeys(root)
  if (created.length) {
    console.info('[auth] 已自动生成密钥:', created.join(', '))
  }
})
