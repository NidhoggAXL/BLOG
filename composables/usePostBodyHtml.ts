import {
  applyWikilinkMarkdownLinks,
  wikilinkEmbedCacheKey,
  type WikilinkEmbedContent,
} from "~/utils/wikilinkShared";
import { renderMarkdownPipeline } from "~/utils/markedSetup";
import type {
  WikilinkParseLink,
  WikilinkEmbedResolved,
} from "~/types/wikilink";

/** 根据解析 API 结果构建 lookup → target slug 映射 */
export function wikilinkLookupMapFromParseLinks(
  links: WikilinkParseLink[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of links) {
    if (row.resolve_status === "ok" && row.target_slug) {
      map.set(row.slug_lookup.toLowerCase(), row.target_slug);
    }
  }
  return map;
}

function embedContentMapFromResolved(
  embeds: WikilinkEmbedResolved[],
): Map<string, WikilinkEmbedContent> {
  const map = new Map<string, WikilinkEmbedContent>();
  for (const e of embeds) {
    if (
      e.resolve_status === "ok" &&
      e.target_slug &&
      e.target_title &&
      e.body_html
    ) {
      const key = e.cache_key ?? wikilinkEmbedCacheKey(e.slug_lookup, e.anchor);
      map.set(key, {
        title: e.target_title,
        slug: e.target_slug,
        body_html: e.body_html,
      });
    }
  }
  return map;
}

/** 正文 Markdown → HTML（双链链接 + ![[...]] 嵌入目标正文） */
export async function renderPostBodyHtmlWithEmbeds(
  markdown: string,
  lookupToSlug: Map<string, string>,
  options?: { stripOrderPrefix?: boolean },
): Promise<string> {
  const stripOrderPrefix = options?.stripOrderPrefix === true;
  let embedContentByLookup = new Map<string, WikilinkEmbedContent>();
  if (markdown.includes("![[")) {
    try {
      const res = await $fetch<{ embeds: WikilinkEmbedResolved[] }>(
        "/api/wikilinks/embeds",
        {
          method: "POST",
          body: { markdown, stripOrderPrefix },
        },
      );
      embedContentByLookup = embedContentMapFromResolved(res.embeds);
    } catch {
      embedContentByLookup = new Map();
    }
  }
  return renderMarkdownPipeline(markdown, (md) =>
    applyWikilinkMarkdownLinks(md, lookupToSlug, {
      embedContentByLookup,
      stripOrderPrefix,
    }),
  );
}

/** 仅链接、不拉取嵌入 */
export async function renderPostBodyHtml(
  markdown: string,
  lookupToSlug: Map<string, string>,
  options?: { stripOrderPrefix?: boolean },
): Promise<string> {
  return renderMarkdownPipeline(markdown, (md) =>
    applyWikilinkMarkdownLinks(md, lookupToSlug, {
      stripOrderPrefix: options?.stripOrderPrefix === true,
    }),
  );
}
