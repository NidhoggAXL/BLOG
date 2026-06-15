/** 歧义命中时的候选目标（供消歧弹窗） */
export type WikilinkAmbiguousCandidate = {
  id: number
  slug: string
  title: string
}

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
  /** resolve_status=ambiguous 时的可选目标列表 */
  ambiguous_candidates?: WikilinkAmbiguousCandidate[]
  hint?: string
}

/** `wikilink_resolutions[].source_key` 的 position 前缀（优先定位方式） */
export const WIKILINK_RESOLUTION_SOURCE_KEY_POSITION_PREFIX = 'position:' as const

/**
 * 单条歧义消解：用户为某条 ambiguous 边选定唯一目标文章。
 * 保存 / 导入 API 通过 `wikilink_resolutions` 字段传入。
 */
export type WikilinkResolution = {
  /**
   * 定位歧义边。优先用 `position:N`（N 为 parse 结果中的 position，同篇内唯一）；
   * 也可传 `raw_target` 原文作兜底定位。
   */
  source_key: string
  /** 用户选定的目标文章 `posts.id` */
  chosen_post_id: number
  /** 批量导入时：源文件 path（与 import files.path 一致）；单篇保存可省略 */
  source_path?: string
}

/** 保存或批量导入请求中的可选消歧字段 */
export type WikilinkResolutionsRequest = {
  wikilink_resolutions?: WikilinkResolution[]
}

/** 按 position 生成 `source_key` */
export function formatWikilinkResolutionSourceKeyByPosition(position: number): string {
  return `${WIKILINK_RESOLUTION_SOURCE_KEY_POSITION_PREFIX}${position}`
}

/** 解析 `source_key`，区分 position 定位与 raw_target 兜底 */
export function parseWikilinkResolutionSourceKey(
  source_key: string,
): { kind: 'position'; position: number } | { kind: 'raw_target'; raw_target: string } {
  const prefix = WIKILINK_RESOLUTION_SOURCE_KEY_POSITION_PREFIX
  if (source_key.startsWith(prefix)) {
    const n = Number(source_key.slice(prefix.length))
    if (Number.isInteger(n) && n >= 0) {
      return { kind: 'position', position: n }
    }
  }
  return { kind: 'raw_target', raw_target: source_key }
}

/** 消歧记录是否适用于当前源文作用域（单篇 / 某导入文件） */
export function wikilinkResolutionAppliesToScope(
  resolution: WikilinkResolution,
  scope?: { source_path?: string },
): boolean {
  if (resolution.source_path) {
    return !!scope?.source_path && resolution.source_path === scope.source_path
  }
  return !scope?.source_path
}

/** 判断解析结果是否匹配某条消歧记录 */
export function wikilinkResolutionMatchesParsed(
  resolution: WikilinkResolution,
  parsed: Pick<WikilinkParseLink, 'position' | 'raw_target'>,
  scope?: { source_path?: string },
): boolean {
  if (!wikilinkResolutionAppliesToScope(resolution, scope)) return false
  const key = parseWikilinkResolutionSourceKey(resolution.source_key)
  if (key.kind === 'position') {
    return parsed.position === key.position
  }
  return parsed.raw_target === key.raw_target
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
