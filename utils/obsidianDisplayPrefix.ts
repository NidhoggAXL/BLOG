/** 匹配 Obsidian 常见排序前缀：01_、01 、01-、01. 等（不吞掉名称中的括号） */
const ORDER_PREFIX_RE = /^\d+(?:[\s_\-]+|\.)/

/** 是否含 Obsidian 排序前缀（手动目录名禁止） */
export function hasObsidianOrderPrefix(raw: string): boolean {
  const s = raw.trim()
  return s.length > 0 && ORDER_PREFIX_RE.test(s)
}

export function stripObsidianOrderPrefix(raw: string): string {
  const s = raw.trim()
  if (!s) return s
  const stripped = s.replace(ORDER_PREFIX_RE, '').trim()
  return stripped || s
}

export function formatPublicDisplayName(raw: string, fallback = '未命名'): string {
  const s = raw.trim()
  if (!s) return fallback
  return stripObsidianOrderPrefix(s) || fallback
}

/** 从目录/文件名段解析 Obsidian 排序数字，如 01_入门 → 1 */
export function obsidianOrderFromSegment(raw: string): number | null {
  const m = raw.trim().match(/^(\d+)/)
  if (!m?.[1]) return null
  const n = Number.parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}
