import crypto from 'node:crypto'
import { getRsaPrivatePem } from './keys'

/** 解密前端 RSA-OAEP 加密的密码（base64） */
export function decryptPasswordCipher(passwordCipher: string): string {
  const raw = String(passwordCipher ?? '').trim()
  if (!raw) {
    throw createError({ statusCode: 400, message: '缺少加密密码' })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(raw, 'base64')
  } catch {
    throw createError({ statusCode: 400, message: '密码密文格式无效' })
  }

  try {
    const plain = crypto.privateDecrypt(
      {
        key: getRsaPrivatePem(),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    )
    return plain.toString('utf8')
  } catch {
    throw createError({ statusCode: 400, message: '密码解密失败' })
  }
}
