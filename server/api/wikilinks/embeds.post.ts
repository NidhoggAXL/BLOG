import type { WikilinkEmbedResolved } from "~/types/wikilink";
import { WIKILINK_EMBED_MAX_DEPTH } from "../../../constants/wikilink";
import { sliceMarkdownByHeadingAnchor } from "../../../utils/markdownAnchorSlice";
import { formatPublicDisplayName } from "../../../utils/obsidianDisplayPrefix";
import {
  wikilinkEmbedCacheKey,
} from "../../../utils/wikilinkShared";
import { renderPostBodyHtmlForPool } from "../../utils/render-post-body-html";
import {
  parseWikilinksFromBody,
  resolveWikilinkLookup,
} from "../../utils/wikilinks";

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

async function buildInnerHtml(
  pool: ReturnType<typeof useMysqlPool>,
  body: string,
  anchor: string | null,
  stripOrderPrefix: boolean,
  embedDepth: number,
): Promise<string> {
  const sliced = sliceMarkdownByHeadingAnchor(body, anchor);
  if (embedDepth >= WIKILINK_EMBED_MAX_DEPTH) {
    return '<p class="wikilink-embed__depth-limit">嵌入层级过深</p>';
  }
  return renderPostBodyHtmlForPool(pool, sliced, {
    stripOrderPrefix,
    embedDepth: embedDepth + 1,
  });
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ markdown?: string; stripOrderPrefix?: boolean }>(event);
  const markdown = typeof body.markdown === "string" ? body.markdown : "";
  const stripOrderPrefix = body.stripOrderPrefix === true;

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
    const body_html = await buildInnerHtml(pool, postBody, row.anchor, stripOrderPrefix, 0);
    const cacheKey = wikilinkEmbedCacheKey(row.slug_lookup, row.anchor);

    out.push({
      slug_lookup: row.slug_lookup,
      raw_target: row.raw_target,
      anchor: row.anchor,
      resolve_status: "ok",
      target_slug: post.slug,
      target_title: embedDisplayTitle(post.title, row.anchor, stripOrderPrefix),
      body_html,
      cache_key: cacheKey,
    });
  }

  return { embeds: out };
});
