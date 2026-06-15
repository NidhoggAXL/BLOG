import type { WikilinkResolution } from '~/types/wikilink'

/** 规范化保存 / 导入请求中的 wikilink_resolutions */
export function normalizeWikilinkResolutions(raw: unknown): WikilinkResolution[] {
  if (!Array.isArray(raw)) return []
  const out: WikilinkResolution[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const source_key = String(row.source_key ?? '').trim()
    const chosen = Number(row.chosen_post_id)
    if (!source_key || !Number.isFinite(chosen) || chosen < 1) continue
    const source_path =
      typeof row.source_path === 'string' && row.source_path.trim()
        ? row.source_path.trim()
        : undefined
    out.push({
      source_key,
      chosen_post_id: Math.floor(chosen),
      ...(source_path ? { source_path } : {}),
    })
  }
  return out
}
