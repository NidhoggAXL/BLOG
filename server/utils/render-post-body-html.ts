import type { Pool } from "mysql2/promise";
import { sliceMarkdownByHeadingAnchor } from "../../utils/markdownAnchorSlice";
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
};

async function buildEmbedInnerHtml(
  pool: Pool,
  body: string,
  anchor: string | null,
  linkBasePath: string,
): Promise<string> {
  const sliced = sliceMarkdownByHeadingAnchor(body, anchor);
  const parsed = parseWikilinksFromBody(sliced);
  const resolved = await resolveParsedWikilinksForPreview(pool, parsed);
  const lookup = new Map<string, string>();
  for (const row of resolved) {
    if (row.resolve_status === "ok" && row.target_slug) {
      lookup.set(row.slug_lookup, row.target_slug);
    }
  }
  return renderMarkdownPipeline(sliced, (md) =>
    applyWikilinkMarkdownLinks(md, lookup, { basePath: linkBasePath }),
  );
}

function embedDisplayTitle(postTitle: string, anchor: string | null): string {
  if (!anchor?.trim()) return postTitle;
  return `${postTitle} › ${anchor.trim()}`;
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
    const body_html = await buildEmbedInnerHtml(
      pool,
      postBody,
      row.anchor,
      linkBasePath,
    );

    embedContentByLookup.set(cacheKey, {
      title: embedDisplayTitle(post.title, row.anchor),
      slug: post.slug,
      body_html,
    });
  }

  return renderMarkdownPipeline(markdown, (md) =>
    applyWikilinkMarkdownLinks(md, lookupToSlug, {
      basePath: linkBasePath,
      embedContentByLookup,
    }),
  );
}
