import { fetchPostBySlug } from "../../utils/post-mutate";
import {
  rebuildPostWikilinksByIds,
  wikilinkTableExists,
} from "../../utils/wikilinks";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  if (!config.mysqlDatabase) {
    throw createError({
      statusCode: 503,
      message: "请在 .env 中配置 MYSQL_DATABASE",
    });
  }

  const body = await readBody<{
    slugs?: string[];
    all?: boolean;
  }>(event);

  const pool = useMysqlPool();
  const conn = await pool.getConnection();

  try {
    if (!(await wikilinkTableExists(conn))) {
      throw createError({
        statusCode: 400,
        message:
          "未创建 post_wikilinks 表，请先执行 db/05-schema-post-wikilinks.sql",
      });
    }

    let postIds: number[] = [];

    if (body.all === true) {
      const [rows] = await conn.query("SELECT id FROM posts ORDER BY id ASC");
      postIds = (rows as { id: number }[]).map((r) => r.id);
    } else {
      const slugs = Array.isArray(body.slugs) ? body.slugs : [];
      if (!slugs.length) {
        throw createError({
          statusCode: 400,
          message: "请提供 slugs 数组，或设置 all: true 重建全库双链",
        });
      }
      const seen = new Set<number>();
      for (const raw of slugs) {
        const slug = String(raw).trim();
        if (!slug) continue;
        const post = await fetchPostBySlug(conn, slug);
        if (!post || seen.has(post.id)) continue;
        seen.add(post.id);
        postIds.push(post.id);
      }
      if (!postIds.length) {
        throw createError({ statusCode: 404, message: "未找到可重建的文章" });
      }
    }

    await conn.beginTransaction();
    const result = await rebuildPostWikilinksByIds(conn, postIds, {
      blockOnAmbiguous: false,
    });
    await conn.commit();

    return {
      ok: true,
      posts_rebuilt: result.rebuilt,
      edges_written: result.edges,
    };
  } catch (e: unknown) {
    await conn.rollback();
    const err = e as { statusCode?: number; sqlMessage?: string };
    if (err.statusCode) throw e;
    throw createError({
      statusCode: 500,
      message: err.sqlMessage || "双链重建失败",
    });
  } finally {
    conn.release();
  }
});
