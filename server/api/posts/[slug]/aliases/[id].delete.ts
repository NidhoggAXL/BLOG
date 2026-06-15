import { fetchPostBySlug } from "../../../../utils/post-mutate";
import { deletePostAlias } from "../../../../utils/post-aliases";
import { resolveAdminPostSlugFromEvent } from "../../../../utils/post-slug-param";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: "请在 .env 中配置 MYSQL_DATABASE" });
  }

  const slug = resolveAdminPostSlugFromEvent(event);
  if (!slug) {
    throw createError({ statusCode: 400, message: "缺少 slug" });
  }

  const idRaw = getRouterParam(event, "id");
  const aliasId = Number(idRaw);
  if (!Number.isFinite(aliasId) || aliasId < 1) {
    throw createError({ statusCode: 400, message: "无效的别名 id" });
  }

  const pool = useMysqlPool();
  const conn = await pool.getConnection();
  try {
    const post = await fetchPostBySlug(conn, slug);
    if (!post) {
      throw createError({ statusCode: 404, message: "文章不存在" });
    }

    const deleted = await deletePostAlias(conn, post.id, aliasId);
    if (!deleted) {
      throw createError({ statusCode: 404, message: "别名不存在" });
    }

    return { deleted: true, id: aliasId };
  } finally {
    conn.release();
  }
});
