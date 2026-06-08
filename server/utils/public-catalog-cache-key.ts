import type { H3Event } from "h3";
import { requireMysqlFromEvent } from "./posts";
import { publicPublishedCacheKey } from "./public-published-cache-key";

type DirHashRow = { dir_hash: string | null };

/** 已发布文章 + 目录结构变化时使公开列表/目录树缓存失效 */
export async function publicCatalogCacheKey(
  event: H3Event,
  scope: string,
): Promise<string> {
  const published = await publicPublishedCacheKey(event, "catalog");
  const { pool } = requireMysqlFromEvent(event);
  const [rows] = await pool.query(
    `SELECT SHA1(GROUP_CONCAT(
       CONCAT(id, ':', IFNULL(parent_id, ''), ':', sort_order, ':', name)
       ORDER BY id SEPARATOR '\\n'
     )) AS dir_hash
     FROM directories`,
  );
  const dirHash = (rows as DirHashRow[])[0]?.dir_hash ?? "0";
  return `${scope}:${published}:dirs:${dirHash}`;
}
