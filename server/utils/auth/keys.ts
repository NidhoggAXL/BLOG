import fs from 'node:fs'
import path from 'node:path'

let rsaPublicPem: string | null = null
let rsaPrivatePem: string | null = null
let jwtPrivatePem: string | null = null
let jwtPublicPem: string | null = null

function resolveKeyPath(relativeOrAbsolute: string): string {
  if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute
  return path.resolve(process.cwd(), relativeOrAbsolute)
}

function readPem(filePath: string): string {
  const resolved = resolveKeyPath(filePath)
  if (!fs.existsSync(resolved)) {
    throw new Error(`密钥文件不存在: ${resolved}，请运行 npm run auth:keys`)
  }
  return fs.readFileSync(resolved, 'utf8')
}

export function getRsaPublicPem(): string {
  if (!rsaPublicPem) {
    const config = useRuntimeConfig()
    rsaPublicPem = readPem(config.authRsaPublicKeyPath)
  }
  return rsaPublicPem
}

export function getRsaPrivatePem(): string {
  if (!rsaPrivatePem) {
    const config = useRuntimeConfig()
    rsaPrivatePem = readPem(config.authRsaPrivateKeyPath)
  }
  return rsaPrivatePem
}

export function getJwtPrivatePem(): string {
  if (!jwtPrivatePem) {
    const config = useRuntimeConfig()
    jwtPrivatePem = readPem(config.authJwtPrivateKeyPath)
  }
  return jwtPrivatePem
}

export function getJwtPublicPem(): string {
  if (!jwtPublicPem) {
    const config = useRuntimeConfig()
    jwtPublicPem = readPem(config.authJwtPublicKeyPath)
  }
  return jwtPublicPem
}
