import { fetchPostBySlug } from "../../../utils/post-mutate";
import { listPostAliases, postAliasesTableExists } from "../../../utils/post-aliases";
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

  const pool = useMysqlPool();
  const conn = await pool.getConnection();
  try {
    const post = await fetchPostBySlug(conn, slug);
    if (!post) {
      throw createError({ statusCode: 404, message: "文章不存在" });
    }

    if (!(await postAliasesTableExists(conn))) {
      return { aliases: [], table_missing: true };
    }

    const aliases = await listPostAliases(conn, post.id);
    return { aliases };
  } finally {
    conn.release();
  }
});
