/** Obsidian 排序：有数字前缀的 sort_order 升序，NULL（无前缀）排最后 */

export function compareObsidianSortOrder(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  const aMissing = a == null
  const bMissing = b == null
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  return a - b
}

/** MySQL：NULL 排最后，再按数值升序 */
export const SQL_ORDER_BY_SORT_ORDER_ASC = "sort_order IS NULL, sort_order ASC"

/** 从 API 输入规范化 sort_order（0 / 空 → null） */
export function normalizeManualSortOrder(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}
