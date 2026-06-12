/**
 * 浏览器端：用服务端 RSA 公钥（PEM SPKI）加密密码，算法 RSA-OAEP + SHA-256
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export async function encryptPasswordRsaOaep(
  publicKeyPem: string,
  password: string,
): Promise<string> {
  const keyData = pemToArrayBuffer(publicKeyPem.trim())
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  const plain = new TextEncoder().encode(password)
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, cryptoKey, plain)
  return arrayBufferToBase64(encrypted)
}

export async function fetchAuthPublicKey(): Promise<string> {
  const res = await $fetch<{ publicKey: string }>('/api/auth/public-key')
  return res.publicKey
}

/** 非 HTTPS（非 localhost）时浏览器不提供 crypto.subtle */
export function canUseSubtleCrypto(): boolean {
  return typeof globalThis.crypto?.subtle?.importKey === 'function'
}
