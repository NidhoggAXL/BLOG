import type { H3Event } from "h3";
import { requireMysqlFromEvent } from "./posts";

type PublishedStatsRow = {
  count: number;
  max_updated: string | null;
};

/** 已发布文章数量/更新时间变化时使公开接口缓存失效 */
export async function publicPublishedCacheKey(
  event: H3Event,
  scope: string,
): Promise<string> {
  const { pool } = requireMysqlFromEvent(event);
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count, MAX(updated_at) AS max_updated
     FROM posts WHERE status = 'published'`,
  );
  const row = (rows as PublishedStatsRow[])[0];
  const count = Number(row?.count ?? 0);
  const updated = row?.max_updated
    ? new Date(row.max_updated).getTime()
    : 0;
  return `${scope}:published:${count}:${updated}`;
}
