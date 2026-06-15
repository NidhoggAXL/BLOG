import { fetchPostBySlug } from "../../../utils/post-mutate";
import { addPostAlias } from "../../../utils/post-aliases";
import { resolveAdminPostSlugFromEvent } from "../../../utils/post-slug-param";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: "请在 .env 中配置 MYSQL_DATABASE" });
  }

  const slug = resolveAdminPostSlugFromEvent(event);
  if (!slug) {
    throw createError({ statusCode: 400, message: "缺少 slug" });
  }

  const body = await readBody<{ alias?: string }>(event);
  const alias = typeof body.alias === "string" ? body.alias : "";

  const pool = useMysqlPool();
  const conn = await pool.getConnection();
  try {
    const post = await fetchPostBySlug(conn, slug);
    if (!post) {
      throw createError({ statusCode: 404, message: "文章不存在" });
    }

    const row = await addPostAlias(conn, post.id, alias);
    return { alias: row };
  } finally {
    conn.release();
  }
});
