import type { WikilinkResolution } from '~/types/wikilink'
import { formatWikilinkResolutionSourceKeyByPosition } from '~/types/wikilink'
import type { WikilinkParseTableRow } from '~/utils/wikilinkParseDisplay'

/** 歧义边在 UI 中的唯一键 */
export function wikilinkAmbiguityRowKey(row: Pick<WikilinkParseTableRow, 'position' | 'source_path'>): string {
  const path = row.source_path?.trim() ?? ''
  return path ? `${path}\t${row.position}` : String(row.position)
}

/** 从解析结果中筛出歧义边 */
export function collectAmbiguousWikilinkRows(
  rows: WikilinkParseTableRow[],
): WikilinkParseTableRow[] {
  return rows.filter(
    (r) =>
      r.resolve_status === 'ambiguous' &&
      (r.ambiguous_candidates?.length ?? 0) > 0,
  )
}

/** 是否所有歧义边均已选择目标 */
export function allAmbiguousWikilinksResolved(
  ambiguousRows: WikilinkParseTableRow[],
  choices: Record<string, number>,
): boolean {
  if (!ambiguousRows.length) return true
  return ambiguousRows.every((row) => {
    const key = wikilinkAmbiguityRowKey(row)
    const id = choices[key]
    return Number.isFinite(id) && id > 0
  })
}

/** 将 UI 选择转为 API 请求的 wikilink_resolutions */
export function buildWikilinkResolutionsFromChoices(
  ambiguousRows: WikilinkParseTableRow[],
  choices: Record<string, number>,
): WikilinkResolution[] {
  const out: WikilinkResolution[] = []
  for (const row of ambiguousRows) {
    const key = wikilinkAmbiguityRowKey(row)
    const chosen = choices[key]
    if (!Number.isFinite(chosen) || chosen < 1) continue
    out.push({
      source_key: formatWikilinkResolutionSourceKeyByPosition(row.position),
      chosen_post_id: Math.floor(chosen),
      ...(row.source_path ? { source_path: row.source_path } : {}),
    })
  }
  return out
}
