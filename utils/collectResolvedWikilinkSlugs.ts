import type { WikilinkParseLink } from '~/types/wikilink'

/** 从解析结果中提取已命中库内文章的目标 slug（去重） */
export function collectResolvedWikilinkSlugs(links: WikilinkParseLink[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const link of links) {
    if (link.resolve_status !== 'ok' || !link.target_slug) continue
    const slug = link.target_slug.split(',')[0]?.trim()
    if (!slug) continue
    const key = slug.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(slug)
  }
  return out
}
