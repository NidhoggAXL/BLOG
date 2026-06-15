import { createError } from "h3";
import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader } from "mysql2";
import type { PostAlias } from "../../types/post-alias";

export async function postAliasesTableExists(executor: {
  query: PoolConnection["query"];
}): Promise<boolean> {
  const [rows] = await executor.query(
    "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    ["post_aliases"],
  );
  return Array.isArray(rows) && rows.length > 0;
}

function normalizeAlias(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 191);
}

export async function listPostAliases(
  conn: PoolConnection,
  postId: number,
): Promise<PostAlias[]> {
  if (!(await postAliasesTableExists(conn))) return [];

  const [rows] = await conn.query(
    `SELECT id, alias, created_at FROM post_aliases
     WHERE post_id = ?
     ORDER BY alias ASC`,
    [postId],
  );
  return (rows as PostAlias[]) ?? [];
}

export async function addPostAlias(
  conn: PoolConnection,
  postId: number,
  rawAlias: string,
): Promise<PostAlias> {
  if (!(await postAliasesTableExists(conn))) {
    throw createError({
      statusCode: 400,
      message:
        "未创建 post_aliases 表，请先执行 db/04-schema-post-aliases.sql",
    });
  }

  const alias = normalizeAlias(rawAlias);
  if (!alias) {
    throw createError({ statusCode: 400, message: "别名不能为空" });
  }

  const [postRows] = await conn.query(
    "SELECT slug FROM posts WHERE id = ? LIMIT 1",
    [postId],
  );
  const slug = (postRows as { slug: string }[])[0]?.slug;
  if (!slug) {
    throw createError({ statusCode: 404, message: "文章不存在" });
  }
  if (alias === slug.toLowerCase()) {
    throw createError({
      statusCode: 400,
      message: "别名不能与当前 slug 相同",
    });
  }

  try {
    const [res] = await conn.query<ResultSetHeader>(
      "INSERT INTO post_aliases (post_id, alias) VALUES (?, ?)",
      [postId, alias],
    );
    const [rows] = await conn.query(
      "SELECT id, alias, created_at FROM post_aliases WHERE id = ? LIMIT 1",
      [res.insertId],
    );
    return (rows as PostAlias[])[0]!;
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number };
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      throw createError({
        statusCode: 409,
        message: `别名「${alias}」已被其他文章占用`,
      });
    }
    throw e;
  }
}

export async function deletePostAlias(
  conn: PoolConnection,
  postId: number,
  aliasId: number,
): Promise<boolean> {
  if (!(await postAliasesTableExists(conn))) return false;

  const [res] = await conn.query(
    "DELETE FROM post_aliases WHERE id = ? AND post_id = ?",
    [aliasId, postId],
  );
  return ((res as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

/**
 * slug 改名时把旧 slug 注册为别名，便于 [[旧名]] 继续命中。
 * 冲突或无效时静默跳过，不阻断保存。
 */
export async function registerSlugAsAliasOnRename(
  conn: PoolConnection,
  postId: number,
  oldSlug: string,
  newSlug: string,
): Promise<{ added: boolean; alias?: string; skipped_reason?: string }> {
  if (!(await postAliasesTableExists(conn))) {
    return { added: false, skipped_reason: "no_table" };
  }

  const oldNorm = normalizeAlias(oldSlug);
  const newNorm = normalizeAlias(newSlug);
  if (!oldNorm || oldNorm === newNorm) {
    return { added: false, skipped_reason: "unchanged" };
  }

  const [existing] = await conn.query(
    "SELECT id FROM post_aliases WHERE post_id = ? AND alias = ? LIMIT 1",
    [postId, oldNorm],
  );
  if ((existing as { id: number }[]).length) {
    return { added: false, skipped_reason: "already_listed" };
  }

  try {
    await conn.query(
      "INSERT INTO post_aliases (post_id, alias) VALUES (?, ?)",
      [postId, oldNorm],
    );
    return { added: true, alias: oldNorm };
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number };
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return { added: false, skipped_reason: "alias_taken" };
    }
    throw e;
  }
}
