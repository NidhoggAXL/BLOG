import type { WikilinkEmbedResolved } from "~/types/wikilink";
import { sliceMarkdownByHeadingAnchor } from "../../../utils/markdownAnchorSlice";
import { renderMarkdownPipeline } from "../../../utils/markedSetup";
import {
  applyWikilinkMarkdownLinks,
  wikilinkEmbedCacheKey,
} from "../../../utils/wikilinkShared";
import {
  parseWikilinksFromBody,
  resolveParsedWikilinksForPreview,
  resolveWikilinkLookup,
} from "../../utils/wikilinks";

async function buildInnerHtml(
  executor: { query: Parameters<typeof resolveWikilinkLookup>[0]["query"] },
  body: string,
  anchor: string | null,
): Promise<string> {
  const sliced = sliceMarkdownByHeadingAnchor(body, anchor);
  const parsed = parseWikilinksFromBody(sliced);
  const resolved = await resolveParsedWikilinksForPreview(executor, parsed);
  const lookup = new Map<string, string>();
  for (const row of resolved) {
    if (row.resolve_status === "ok" && row.target_slug) {
      lookup.set(row.slug_lookup, row.target_slug);
    }
  }
  return renderMarkdownPipeline(sliced, (md) =>
    applyWikilinkMarkdownLinks(md, lookup, { basePath: "/admin/posts" }),
  );
}

function embedDisplayTitle(postTitle: string, anchor: string | null): string {
  if (!anchor?.trim()) return postTitle;
  return `${postTitle} › ${anchor.trim()}`;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ markdown?: string }>(event);
  const markdown = typeof body.markdown === "string" ? body.markdown : "";

  const all = parseWikilinksFromBody(markdown);
  const embeds = all.filter((p) => p.link_kind === "embed");
  const seen = new Set<string>();
  const unique = embeds.filter((e) => {
    const key = wikilinkEmbedCacheKey(e.slug_lookup, e.anchor);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!unique.length) {
    return { embeds: [] as WikilinkEmbedResolved[] };
  }

  const config = useRuntimeConfig(event);
  if (!config.mysqlDatabase) {
    const skipped: WikilinkEmbedResolved[] = unique.map((e) => ({
      slug_lookup: e.slug_lookup,
      raw_target: e.raw_target,
      anchor: e.anchor,
      resolve_status: "skipped",
      hint: "未配置 MYSQL_DATABASE",
    }));
    return { embeds: skipped };
  }

  const pool = useMysqlPool();
  const out: WikilinkEmbedResolved[] = [];

  for (const row of unique) {
    const resolved = await resolveWikilinkLookup(pool, row.slug_lookup, {
      maxCandidates: 2,
    });
    if (resolved.status === "missing_target") {
      out.push({
        slug_lookup: row.slug_lookup,
        raw_target: row.raw_target,
        anchor: row.anchor,
        resolve_status: "missing_target",
      });
      continue;
    }
    if (resolved.status === "ambiguous") {
      out.push({
        slug_lookup: row.slug_lookup,
        raw_target: row.raw_target,
        anchor: row.anchor,
        resolve_status: "ambiguous",
        hint: "多个匹配目标",
      });
      continue;
    }

    const post = resolved.post;
    const [postRows] = await pool.query(
      "SELECT body FROM posts WHERE id = ? LIMIT 1",
      [post.id],
    );
    const postBody = (postRows as { body: string }[])[0]?.body ?? "";
    const body_html = await buildInnerHtml(pool, postBody, row.anchor);
    const cacheKey = wikilinkEmbedCacheKey(row.slug_lookup, row.anchor);

    out.push({
      slug_lookup: row.slug_lookup,
      raw_target: row.raw_target,
      anchor: row.anchor,
      resolve_status: "ok",
      target_slug: post.slug,
      target_title: embedDisplayTitle(post.title, row.anchor),
      body_html,
      cache_key: cacheKey,
    });
  }

  return { embeds: out };
});
