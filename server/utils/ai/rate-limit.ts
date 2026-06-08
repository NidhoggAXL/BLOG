const hits = new Map<string, number[]>()

export function checkPublicAiRateLimit(ip: string, limitPerMin: number): boolean {
  const now = Date.now()
  const windowMs = 60_000
  const key = ip || 'unknown'
  const timestamps = hits.get(key) ?? []
  const recent = timestamps.filter((t) => now - t < windowMs)
  if (recent.length >= limitPerMin) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}

export function getClientIp(event: Parameters<typeof getRequestHeader>[0]): string {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
}
