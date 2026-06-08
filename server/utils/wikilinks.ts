import type { PoolConnection } from "mysql2/promise";
import {
  expandWikilinkSlugLookups,
  maskMarkdownForWikilinkScan,
  parseWikilinkInner,
} from "../../utils/wikilinkShared";

export {
  maskMarkdownForWikilinkScan,
  bodyContainsWikilinkToSlug,
  stripMergedOutboundWikilinkBlock,
  mergeWikilinkSlugsIntoBody,
} from "../../utils/wikilinkShared";

export type ParsedWikilink = {
  link_kind: "link" | "embed";
  raw_target: string;
  link_display: string | null;
  anchor: string | null;
  /** 用于匹配 posts.slug / post_aliases.alias，已小写 trim */
  slug_lookup: string;
  position: number;
};

export function parseWikilinksFromBody(markdown: string): ParsedWikilink[] {
  const masked = maskMarkdownForWikilinkScan(markdown);
  const out: ParsedWikilink[] = [];
  const re = /(!?)\[\[([^\]\n]+)\]\]/g;
  let position = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const kind: "link" | "embed" = m[1] === "!" ? "embed" : "link";
    const parsed = parseWikilinkInner(m[2]);
    if (!parsed) continue;
    out.push({
      link_kind: kind,
      raw_target: parsed.raw_target,
      link_display: parsed.link_display,
      anchor: parsed.anchor,
      slug_lookup: parsed.slug_lookup,
      position: position++,
    });
  }
  return out;
}

type ResolvedPost = { id: number; slug: string; title: string };

export type WikilinkResolveResult =
  | { status: "ok"; post: ResolvedPost }
  | { status: "missing_target" }
  | { status: "ambiguous"; posts: ResolvedPost[] };

async function postAliasesTableExists(executor: {
  query: PoolConnection["query"];
}): Promise<boolean> {
  const [rows] = await executor.query(
    "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    ["post_aliases"],
  );
  return Array.isArray(rows) && rows.length > 0;
}

export type WikilinkResolveOptions = {
  maxCandidates?: number;
  aliasesEnabled?: boolean;
  /** 批量导入等同批尚未提交时的待解析目标（slug → 文章） */
  batchLookup?: Map<string, ResolvedPost>;
};

function dedupeResolvedPosts(posts: ResolvedPost[]): ResolvedPost[] {
  const seen = new Set<number>();
  const out: ResolvedPost[] = [];
  for (const p of posts) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/** 将本批导入文章的 slug / 文件名 stem 注册为可解析键 */
export function buildImportBatchWikilinkLookup(
  rows: { id: number; slug: string; title: string; stem?: string }[],
): Map<string, ResolvedPost> {
  const map = new Map<string, ResolvedPost>();
  for (const row of rows) {
    const post: ResolvedPost = { id: row.id, slug: row.slug, title: row.title };
    const keys = new Set<string>();
    for (const key of expandWikilinkSlugLookups(row.slug)) keys.add(key);
    if (row.stem) {
      for (const key of expandWikilinkSlugLookups(row.stem)) keys.add(key);
    }
    for (const key of keys) {
      if (!map.has(key)) map.set(key, post);
    }
  }
  return map;
}

/** slug 精确 → post_aliases.alias 精确；可选 batchLookup 覆盖同批导入 */
export async function resolveWikilinkLookup(
  executor: { query: PoolConnection["query"] },
  slugLookup: string,
  options?: WikilinkResolveOptions,
): Promise<WikilinkResolveResult> {
  const lookups = expandWikilinkSlugLookups(slugLookup);
  if (!lookups.length) return { status: "missing_target" };

  const limit = options?.maxCandidates ?? 3;

  if (options?.batchLookup) {
    const batchHits = dedupeResolvedPosts(
      lookups
        .map((lu) => options.batchLookup!.get(lu))
        .filter((p): p is ResolvedPost => !!p),
    );
    if (batchHits.length === 1) return { status: "ok", post: batchHits[0]! };
    if (batchHits.length > 1) return { status: "ambiguous", posts: batchHits };
  }

  let candidates: ResolvedPost[] = [];
  for (const lookup of lookups) {
    const [bySlug] = await executor.query(
      "SELECT id, slug, title FROM posts WHERE LOWER(slug) = ? ORDER BY id ASC LIMIT ?",
      [lookup, limit],
    );
    candidates = dedupeResolvedPosts([
      ...candidates,
      ...((bySlug as ResolvedPost[]) ?? []),
    ]);
    if (candidates.length) break;
  }

  if (
    candidates.length === 0 &&
    options?.aliasesEnabled !== false &&
    (await postAliasesTableExists(executor))
  ) {
    for (const lookup of lookups) {
      const [byAlias] = await executor.query(
        `SELECT p.id, p.slug, p.title
         FROM post_aliases a
         INNER JOIN posts p ON p.id = a.post_id
         WHERE LOWER(a.alias) = ?
         ORDER BY p.id ASC
         LIMIT ?`,
        [lookup, limit],
      );
      candidates = dedupeResolvedPosts([
        ...candidates,
        ...((byAlias as ResolvedPost[]) ?? []),
      ]);
      if (candidates.length) break;
    }
  }

  if (!candidates.length) return { status: "missing_target" };
  if (candidates.length > 1) return { status: "ambiguous", posts: candidates };
  return { status: "ok", post: candidates[0]! };
}

/** 预览：将解析结果与 posts / post_aliases 对照（不落库） */
export type WikilinkResolvedPreview = ParsedWikilink & {
  resolve_status: "ok" | "missing_target" | "ambiguous";
  target_id?: number;
  target_slug?: string;
  target_title?: string;
};

export async function resolveParsedWikilinksForPreview(
  executor: { query: PoolConnection["query"] },
  parsed: ParsedWikilink[],
  options?: Pick<WikilinkResolveOptions, "batchLookup">,
): Promise<WikilinkResolvedPreview[]> {
  const out: WikilinkResolvedPreview[] = [];
  for (const row of parsed) {
    const resolved = await resolveWikilinkLookup(executor, row.slug_lookup, {
      maxCandidates: 3,
      batchLookup: options?.batchLookup,
    });
    if (resolved.status === "missing_target") {
      out.push({ ...row, resolve_status: "missing_target" });
    } else if (resolved.status === "ambiguous") {
      out.push({
        ...row,
        resolve_status: "ambiguous",
        target_slug: resolved.posts.map((x) => x.slug).join(", "),
      });
    } else {
      const t = resolved.post;
      out.push({
        ...row,
        resolve_status: "ok",
        target_id: t.id,
        target_slug: t.slug,
        target_title: t.title,
      });
    }
  }
  return out;
}

async function wikilinkTableExists(conn: PoolConnection): Promise<boolean> {
  const [rows] = await conn.query(
    "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    ["post_wikilinks"],
  );
  return Array.isArray(rows) && rows.length > 0;
}

export { wikilinkTableExists };

/** 将表单显式勾选的目标 slug 并入解析结果（避免仅因 merge 去重逻辑漏写边表） */
function mergeExplicitSlugsIntoParsed(
  parsed: ParsedWikilink[],
  explicitSlugs: string[],
): ParsedWikilink[] {
  const seen = new Set(parsed.map((p) => p.slug_lookup));
  let position = parsed.length;
  const normalized = [
    ...new Set(
      explicitSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean),
    ),
  ];
  const out = [...parsed];
  for (const slugLookup of normalized) {
    if (seen.has(slugLookup)) continue;
    seen.add(slugLookup);
    out.push({
      link_kind: "link",
      raw_target: slugLookup.slice(0, 512),
      link_display: null,
      anchor: null,
      slug_lookup: slugLookup.slice(0, 191),
      position: position++,
    });
  }
  return out;
}

export type SyncPostWikilinksResult = {
  inserted: number;
  skipped: boolean;
  skipReason?: "no_table";
};

/** 按正文 + 显式勾选的双链目标重建出链行（需在事务内调用） */
export async function syncPostWikilinks(
  conn: PoolConnection,
  sourcePostId: number,
  body: string,
  explicitTargetSlugs: string[] = [],
  options?: Pick<WikilinkResolveOptions, "batchLookup">,
): Promise<SyncPostWikilinksResult> {
  if (!(await wikilinkTableExists(conn))) {
    return { inserted: 0, skipped: true, skipReason: "no_table" };
  }

  await conn.query("DELETE FROM post_wikilinks WHERE source_post_id = ?", [
    sourcePostId,
  ]);

  const fromBody = parseWikilinksFromBody(body);
  const parsed = mergeExplicitSlugsIntoParsed(fromBody, explicitTargetSlugs);
  if (!parsed.length) {
    return { inserted: 0, skipped: false };
  }

  for (const row of parsed) {
    const resolved = await resolveWikilinkLookup(conn, row.slug_lookup, {
      maxCandidates: 2,
      batchLookup: options?.batchLookup,
    });
    let targetId: number | null = null;
    let resolve_status: "ok" | "missing_target" | "ambiguous" | "self_loop" =
      "ok";
    if (resolved.status === "missing_target") {
      resolve_status = "missing_target";
    } else if (resolved.status === "ambiguous") {
      resolve_status = "ambiguous";
    } else {
      targetId = resolved.post.id;
      if (targetId === sourcePostId) {
        resolve_status = "self_loop";
        targetId = null;
      }
    }

    await conn.query(
      `INSERT INTO post_wikilinks
        (source_post_id, target_post_id, raw_target, link_display, link_kind, anchor, position, resolve_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sourcePostId,
        targetId,
        row.raw_target,
        row.link_display,
        row.link_kind,
        row.anchor,
        row.position,
        resolve_status,
      ],
    );
  }

  return { inserted: parsed.length, skipped: false };
}

export type WikilinkBacklinkRow = {
  source_post_id: number;
  source_slug: string;
  source_title: string;
  link_kind: "link" | "embed";
  raw_target: string;
};

/** 查询指向某篇文章的反向链接（用于删除前提示） */
export async function getInboundWikilinks(
  conn: PoolConnection,
  targetPostId: number,
): Promise<WikilinkBacklinkRow[]> {
  if (!(await wikilinkTableExists(conn))) return [];

  const [rows] = await conn.query(
    `SELECT w.source_post_id, w.link_kind, w.raw_target, p.slug AS source_slug, p.title AS source_title
     FROM post_wikilinks w
     INNER JOIN posts p ON p.id = w.source_post_id
     WHERE w.target_post_id = ?
     ORDER BY p.title ASC, w.position ASC`,
    [targetPostId],
  );
  return (rows as WikilinkBacklinkRow[]) ?? [];
}

export async function countWikilinkEdges(
  conn: PoolConnection,
  postId: number,
): Promise<{ outbound: number; inbound: number }> {
  if (!(await wikilinkTableExists(conn))) {
    return { outbound: 0, inbound: 0 };
  }
  const [outRows] = await conn.query(
    "SELECT COUNT(*) AS c FROM post_wikilinks WHERE source_post_id = ?",
    [postId],
  );
  const [inRows] = await conn.query(
    "SELECT COUNT(*) AS c FROM post_wikilinks WHERE target_post_id = ?",
    [postId],
  );
  const outbound = Number((outRows as { c: number }[])[0]?.c ?? 0);
  const inbound = Number((inRows as { c: number }[])[0]?.c ?? 0);
  return { outbound, inbound };
}

/**
 * 删除文章前的双链处理：将入链标为 missing_target（随后 DELETE 会 CASCADE 出链、SET NULL 入链）
 */
export async function markInboundWikilinksMissing(
  conn: PoolConnection,
  targetPostId: number,
): Promise<number> {
  if (!(await wikilinkTableExists(conn))) return 0;
  const [res] = await conn.query(
    `UPDATE post_wikilinks SET resolve_status = 'missing_target'
     WHERE target_post_id = ?`,
    [targetPostId],
  );
  return (res as { affectedRows?: number }).affectedRows ?? 0;
}

export type PostWikilinkRef = {
  slug: string;
  title: string;
};

/** 文章详情侧栏：入链 / 出链（已解析成功） */
export async function getPostWikilinkRefs(
  conn: PoolConnection,
  postId: number,
  options?: { publishedOnly?: boolean },
): Promise<{ inbound: PostWikilinkRef[]; outbound: PostWikilinkRef[] }> {
  if (!(await wikilinkTableExists(conn))) {
    return { inbound: [], outbound: [] };
  }

  const publishedOnly = options?.publishedOnly === true;
  const statusClause = publishedOnly ? " AND p.status = 'published'" : "";

  const [outRows, inRows] = await Promise.all([
    conn.query(
      `SELECT DISTINCT p.slug, p.title
       FROM post_wikilinks w
       INNER JOIN posts p ON p.id = w.target_post_id
       WHERE w.source_post_id = ?
         AND w.target_post_id IS NOT NULL
         AND w.resolve_status = 'ok'${statusClause}
       ORDER BY p.title ASC, p.slug ASC`,
      [postId],
    ),
    conn.query(
      `SELECT DISTINCT p.slug, p.title
       FROM post_wikilinks w
       INNER JOIN posts p ON p.id = w.source_post_id
       WHERE w.target_post_id = ?
         AND w.resolve_status = 'ok'${statusClause}
       ORDER BY p.title ASC, p.slug ASC`,
      [postId],
    ),
  ]);

  return {
    outbound: (outRows[0] as PostWikilinkRef[]) ?? [],
    inbound: (inRows[0] as PostWikilinkRef[]) ?? [],
  };
}

/** 该文作为出链源时勾选过的目标 slug（编辑表单回显） */
export async function getExplicitOutboundSlugs(
  conn: PoolConnection,
  sourcePostId: number,
): Promise<string[]> {
  if (!(await wikilinkTableExists(conn))) return [];
  const [rows] = await conn.query(
    `SELECT DISTINCT p.slug
     FROM post_wikilinks w
     INNER JOIN posts p ON p.id = w.target_post_id
     WHERE w.source_post_id = ? AND w.target_post_id IS NOT NULL AND w.resolve_status = 'ok'
     ORDER BY p.slug ASC`,
    [sourcePostId],
  );
  return (rows as { slug: string }[]).map((r) => r.slug);
}
