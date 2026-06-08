/** 从 $fetch / createError 抛出的异常中提取用户可读文案 */
export function fetchErrorMessage(e: unknown, fallback = '请求失败'): string {
  if (!e || typeof e !== 'object') return fallback
  const err = e as {
    statusMessage?: string
    message?: string
    data?: { statusMessage?: string; message?: string }
  }
  // Nuxt createError 常把具体原因放在 message，statusMessage 仅为 "Server Error"
  const fromData = err.data?.message || err.data?.statusMessage
  const fromTop =
    typeof err.message === 'string' &&
    !err.message.startsWith('[POST]') &&
    !err.message.startsWith('[GET]')
      ? err.message
      : ''
  return fromData || err.statusMessage || fromTop || fallback
}
