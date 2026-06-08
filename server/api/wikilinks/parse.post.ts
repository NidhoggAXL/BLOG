import type { WikilinkParseLink } from '~/types/wikilink'
import { expandWikilinkSlugLookups } from '../../../utils/wikilinkShared'
import { parseWikilinksFromBody, resolveParsedWikilinksForPreview } from '../../utils/wikilinks'

type PendingSlug = { slug?: string; title?: string; stem?: string }

function buildPendingBatchLookup(pending: PendingSlug[]) {
  const map = new Map<string, { id: number; slug: string; title: string }>()
  for (const row of pending) {
    const slug = String(row.slug ?? '').trim()
    if (!slug) continue
    const post = { id: 0, slug, title: String(row.title ?? slug).trim() || slug }
    const keys = new Set<string>()
    for (const key of expandWikilinkSlugLookups(slug)) keys.add(key)
    const stem = String(row.stem ?? '').trim()
    if (stem) {
      for (const key of expandWikilinkSlugLookups(stem)) keys.add(key)
    }
    for (const key of keys) {
      if (!map.has(key)) map.set(key, post)
    }
  }
  return map
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ markdown?: string; pending_slugs?: PendingSlug[] }>(event)
  const markdown = typeof body.markdown === 'string' ? body.markdown : ''

  const parsed = parseWikilinksFromBody(markdown)
  if (!parsed.length) {
    return { links: [] as WikilinkParseLink[] }
  }

  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    const links: WikilinkParseLink[] = parsed.map((p) => ({
      link_kind: p.link_kind,
      raw_target: p.raw_target,
      link_display: p.link_display,
      anchor: p.anchor,
      slug_lookup: p.slug_lookup,
      position: p.position,
      resolve_status: 'skipped',
      hint: '未配置 MYSQL_DATABASE，仅完成语法解析，未对照 posts / post_aliases 表',
    }))
    return { links }
  }

  const pool = useMysqlPool()
  const pending = Array.isArray(body.pending_slugs) ? body.pending_slugs : []
  const batchLookup = pending.length ? buildPendingBatchLookup(pending) : undefined
  const resolved = await resolveParsedWikilinksForPreview(pool, parsed, { batchLookup })
  const links: WikilinkParseLink[] = resolved.map((r) => ({
    link_kind: r.link_kind,
    raw_target: r.raw_target,
    link_display: r.link_display,
    anchor: r.anchor,
    slug_lookup: r.slug_lookup,
    position: r.position,
    resolve_status: r.resolve_status,
    target_id: r.target_id,
    target_slug: r.target_slug,
    target_title: r.target_title,
  }))

  return { links }
})
