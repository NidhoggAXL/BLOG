import type { Pool } from "mysql2/promise";
import { WIKILINK_EMBED_MAX_DEPTH } from "../../constants/wikilink";
import { sliceMarkdownByHeadingAnchor } from "../../utils/markdownAnchorSlice";
import { formatPublicDisplayName } from "../../utils/obsidianDisplayPrefix";
import { renderMarkdownPipeline } from "../../utils/markedSetup";
import {
  applyWikilinkMarkdownLinks,
  wikilinkEmbedCacheKey,
  type WikilinkEmbedContent,
} from "../../utils/wikilinkShared";
import {
  parseWikilinksFromBody,
  resolveParsedWikilinksForPreview,
  resolveWikilinkLookup,
} from "./wikilinks";

export type RenderPostBodyHtmlOptions = {
  linkBasePath?: string;
  stripOrderPrefix?: boolean;
  /** 当前嵌入递归深度（0=顶层正文） */
  embedDepth?: number;
};

function embedDisplayTitle(
  postTitle: string,
  anchor: string | null,
  stripOrderPrefix: boolean,
): string {
  const title = stripOrderPrefix
    ? formatPublicDisplayName(postTitle, postTitle)
    : postTitle;
  if (!anchor?.trim()) return title;
  return `${title} › ${anchor.trim()}`;
}

/** 服务端渲染文章正文（双链 + 嵌入 + Markdown + Shiki） */
export async function renderPostBodyHtmlForPool(
  pool: Pool,
  markdown: string,
  options?: RenderPostBodyHtmlOptions,
): Promise<string> {
  if (!markdown.trim()) return "";

  const config = useRuntimeConfig();
  const linkBasePath =
    options?.linkBasePath ??
    config.adminWikilinkBasePath ??
    "/admin/posts";
  const stripOrderPrefix = options?.stripOrderPrefix === true;
  const embedDepth = options?.embedDepth ?? 0;

  const parsed = parseWikilinksFromBody(markdown);
  const resolved = await resolveParsedWikilinksForPreview(pool, parsed);
  const lookupToSlug = new Map<string, string>();
  for (const row of resolved) {
    if (row.resolve_status === "ok" && row.target_slug) {
      lookupToSlug.set(row.slug_lookup.toLowerCase(), row.target_slug);
    }
  }

  const embedContentByLookup = new Map<string, WikilinkEmbedContent>();
  const embeds = parsed.filter((p) => p.link_kind === "embed");
  const seen = new Set<string>();

  if (embedDepth < WIKILINK_EMBED_MAX_DEPTH) {
    for (const row of embeds) {
      const cacheKey = wikilinkEmbedCacheKey(row.slug_lookup, row.anchor);
      if (seen.has(cacheKey)) continue;
      seen.add(cacheKey);

      const resolvedEmbed = await resolveWikilinkLookup(pool, row.slug_lookup, {
        maxCandidates: 2,
      });
      if (resolvedEmbed.status !== "ok") continue;

      const post = resolvedEmbed.post;
      const [postRows] = await pool.query(
        "SELECT body FROM posts WHERE id = ? LIMIT 1",
        [post.id],
      );
      const postBody = (postRows as { body: string }[])[0]?.body ?? "";
      const sliced = sliceMarkdownByHeadingAnchor(postBody, row.anchor);
      const body_html = await renderPostBodyHtmlForPool(pool, sliced, {
        linkBasePath,
        stripOrderPrefix,
        embedDepth: embedDepth + 1,
      });

      embedContentByLookup.set(cacheKey, {
        title: embedDisplayTitle(post.title, row.anchor, stripOrderPrefix),
        slug: post.slug,
        body_html,
      });
    }
  }

  return renderMarkdownPipeline(markdown, (md) =>
    applyWikilinkMarkdownLinks(md, lookupToSlug, {
      basePath: linkBasePath,
      embedContentByLookup,
      stripOrderPrefix,
      embedDepthLimitReached: embedDepth >= WIKILINK_EMBED_MAX_DEPTH,
    }),
  );
}
