import { collectResolvedWikilinkSlugs } from '~/utils/collectResolvedWikilinkSlugs'
import type { WikilinkParseLink } from '~/types/wikilink'

type PendingSlug = { slug?: string; title?: string; stem?: string }

/** 对照 posts / post_aliases 解析正文中的全部双链 */
export async function parseWikilinksFromMarkdown(
  markdown: string,
  options?: { pendingSlugs?: PendingSlug[] },
): Promise<WikilinkParseLink[]> {
  const text = markdown.trim()
  if (!text) return []

  const res = await $fetch<{ links: WikilinkParseLink[] }>('/api/wikilinks/parse', {
    method: 'POST',
    body: {
      markdown: text,
      pending_slugs: options?.pendingSlugs,
    },
  })
  return res.links ?? []
}

/** 解析正文双链，返回已命中的目标 slug */
export async function resolveWikilinkSlugsFromMarkdown(
  markdown: string,
  options?: { pendingSlugs?: PendingSlug[] },
): Promise<string[]> {
  const links = await parseWikilinksFromMarkdown(markdown, options)
  return collectResolvedWikilinkSlugs(links)
}
