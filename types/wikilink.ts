/** POST /api/wikilinks/parse 返回的单条（含解析 + 可选库内解析） */
export type WikilinkParseLink = {
  link_kind: 'link' | 'embed'
  raw_target: string
  link_display: string | null
  anchor: string | null
  slug_lookup: string
  position: number
  resolve_status: 'ok' | 'missing_target' | 'ambiguous' | 'skipped'
  target_id?: number
  target_slug?: string
  target_title?: string
  hint?: string
}

/** POST /api/wikilinks/embeds 返回的嵌入块（已渲染 HTML） */
export type WikilinkEmbedResolved = {
  slug_lookup: string
  raw_target: string
  anchor: string | null
  resolve_status: 'ok' | 'missing_target' | 'ambiguous' | 'skipped'
  target_slug?: string
  target_title?: string
  /** 已渲染的嵌入正文 HTML（不含外层 embed 壳） */
  body_html?: string
  /** 与 wikilinkEmbedCacheKey 一致，供前端匹配 */
  cache_key?: string
  hint?: string
}
