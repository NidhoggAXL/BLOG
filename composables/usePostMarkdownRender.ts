import {
  renderPostBodyHtml,
  renderPostBodyHtmlWithEmbeds,
  wikilinkLookupMapFromParseLinks,
} from '~/composables/usePostBodyHtml'
import type { WikilinkParseLink } from '~/types/wikilink'

const lookupCache = new Map<string, Map<string, string>>()
const htmlCache = new Map<string, string>()

function cacheKey(markdown: string, withEmbeds: boolean) {
  return `${withEmbeds ? 'e' : 'l'}:${markdown.length}:${markdown.slice(0, 120)}:${markdown.slice(-80)}`
}

/** 解析正文中的双链，得到 lookup → slug */
export async function resolveWikilinkLookupMap(
  markdown: string,
): Promise<Map<string, string>> {
  if (!markdown.includes('[[')) return new Map()

  const key = `lookup:${markdown.length}:${markdown.slice(0, 200)}`
  const hit = lookupCache.get(key)
  if (hit) return hit

  try {
    const res = await $fetch<{ links: WikilinkParseLink[] }>('/api/wikilinks/parse', {
      method: 'POST',
      body: { markdown },
    })
    const map = wikilinkLookupMapFromParseLinks(res.links)
    lookupCache.set(key, map)
    return map
  } catch {
    return new Map()
  }
}

export function invalidatePostMarkdownRenderCache() {
  lookupCache.clear()
  htmlCache.clear()
}

/** 与阅读页一致：callout + Shiki + 双链 + 嵌入 */
export async function renderPostMarkdownForView(
  markdown: string,
  opts?: { withEmbeds?: boolean },
): Promise<string> {
  const withEmbeds = opts?.withEmbeds !== false
  const key = cacheKey(markdown, withEmbeds)
  const hit = htmlCache.get(key)
  if (hit !== undefined) return hit

  const lookup = await resolveWikilinkLookupMap(markdown)
  const html = withEmbeds
    ? await renderPostBodyHtmlWithEmbeds(markdown, lookup)
    : await renderPostBodyHtml(markdown, lookup)

  if (html.trim() || !markdown.trim()) {
    htmlCache.set(key, html)
  }
  return html
}
