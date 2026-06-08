/** ISO / MySQL 时间 → 中文日期，如 2026年5月16日 */
export function formatDateZh(value: string | null | undefined): string {
  if (value == null || value === '') return '—'
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return String(value)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
