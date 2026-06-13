import type { PublicPostDetail, PublicPostMeta } from "../../types/blog";
import type { PostDetail, PostListItem } from "../../types/post";
import { renderPostBodyHtmlForPool } from "./render-post-body-html";
import { getExplicitOutboundSlugs, getPostWikilinkRefs } from "./wikilinks";

type PostListRow = {
  id: number;
  directory_id: number | null;
  slug: string;
  title: string;
  body: string;
  status: PostListItem["status"];
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~#>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assertMysqlDatabase(config: ReturnType<typeof useRuntimeConfig>) {
  if (!config.mysqlDatabase) {
    throw createError({
      statusCode: 503,
      message: "请在 .env 中配置 MYSQL_DATABASE",
    });
  }
}

export async function listPosts(
  pool: ReturnType<typeof useMysqlPool>,
  opts?: { publishedOnly?: boolean },
): Promise<PostListItem[]> {
  const publishedOnly = opts?.publishedOnly === true;
  const where = publishedOnly ? " WHERE status = 'published'" : "";
  const [rows] = await pool.query(
    `SELECT id, directory_id, slug, title, status, created_at, updated_at
     FROM posts${where}
     ORDER BY COALESCE(directory_id, 0), title ASC`,
  );
  return rows as PostListItem[];
}

export async function listPublicPosts(
  pool: ReturnType<typeof useMysqlPool>,
): Promise<PublicPostMeta[]> {
  const [rows] = await pool.query(
    `SELECT directory_id, slug, title, published_at, updated_at, created_at
     FROM posts
     WHERE status = 'published'
     ORDER BY COALESCE(published_at, updated_at, created_at) DESC`,
  );

  return (rows as Omit<PostListRow, "body" | "status" | "id">[]).map((row) => {
    const date = row.published_at || row.updated_at || row.created_at;
    return {
      slug: row.slug,
      title: row.title,
      directory_id: row.directory_id,
      date,
      tags: [],
    } satisfies PublicPostMeta;
  });
}

export async function getPostDetail(
  pool: ReturnType<typeof useMysqlPool>,
  slug: string,
  opts?: {
    publishedOnly?: boolean;
    linkBasePath?: string;
    stripOrderPrefix?: boolean;
    includeWikilinkSlugs?: boolean;
    includeWikilinkRefs?: boolean;
  },
): Promise<PostDetail | null> {
  const publishedOnly = opts?.publishedOnly === true;
  const where = publishedOnly
    ? " WHERE slug = ? AND status = 'published'"
    : " WHERE slug = ?";
  const [rows] = await pool.query(
    `SELECT id, directory_id, slug, title, body, status, published_at, created_at, updated_at
     FROM posts${where}
     LIMIT 1`,
    [slug],
  );
  const row = (rows as PostDetail[])[0];
  if (!row) return null;

  let body_html = "";
  try {
    body_html = await renderPostBodyHtmlForPool(pool, row.body, {
      linkBasePath: opts?.linkBasePath,
      stripOrderPrefix: opts?.stripOrderPrefix,
    });
  } catch {
    body_html = "";
  }

  let wikilink_target_slugs: string[] | undefined;
  let inbound_links: { slug: string; title: string }[] | undefined;
  let outbound_links: { slug: string; title: string }[] | undefined;
  if (opts?.includeWikilinkSlugs !== false || opts?.includeWikilinkRefs !== false) {
    const conn = await pool.getConnection();
    try {
      if (opts?.includeWikilinkSlugs !== false) {
        wikilink_target_slugs = await getExplicitOutboundSlugs(conn, row.id);
      }
      if (opts?.includeWikilinkRefs !== false) {
        const refs = await getPostWikilinkRefs(conn, row.id, {
          publishedOnly: opts?.publishedOnly,
        });
        inbound_links = refs.inbound;
        outbound_links = refs.outbound;
      }
    } finally {
      conn.release();
    }
  }

  return { ...row, body_html, wikilink_target_slugs, inbound_links, outbound_links };
}

export async function getPublicPostDetail(
  pool: ReturnType<typeof useMysqlPool>,
  slug: string,
  linkBasePath: string,
): Promise<PublicPostDetail | null> {
  const detail = await getPostDetail(pool, slug, {
    publishedOnly: true,
    linkBasePath,
    stripOrderPrefix: true,
    includeWikilinkSlugs: false,
    includeWikilinkRefs: true,
  });
  if (!detail) return null;

  const date =
    detail.published_at || detail.updated_at || detail.created_at;

  return {
    slug: detail.slug,
    title: detail.title,
    directory_id: detail.directory_id,
    date,
    tags: [],
    body_html: detail.body_html ?? "",
    inbound_links: detail.inbound_links ?? [],
    outbound_links: detail.outbound_links ?? [],
  } satisfies PublicPostDetail;
}

export function requireMysqlFromEvent(event: Parameters<typeof getRouterParam>[0]) {
  const config = useRuntimeConfig(event);
  assertMysqlDatabase(config);
  return { config, pool: useMysqlPool() };
}
