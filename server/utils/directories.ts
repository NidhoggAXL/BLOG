import type { DirectoryRow } from "../../types/directory";
import type { PublicDirectoryRow } from "../../types/blog";
import { SQL_ORDER_BY_SORT_ORDER_ASC } from "../../utils/sortOrder";

export async function listAllDirectories(
  pool: ReturnType<typeof useMysqlPool>,
): Promise<DirectoryRow[]> {
  const [rows] = await pool.query(
    `SELECT id, parent_id, name, slug, sort_order FROM directories ORDER BY COALESCE(parent_id, 0), ${SQL_ORDER_BY_SORT_ORDER_ASC}, id`,
  );
  return rows as DirectoryRow[];
}

/** 前台目录树：返回全部目录（含无已发布文章的空文件夹） */
export async function listPublicDirectories(
  pool: ReturnType<typeof useMysqlPool>,
): Promise<PublicDirectoryRow[]> {
  return listAllDirectories(pool) as PublicDirectoryRow[];
}
