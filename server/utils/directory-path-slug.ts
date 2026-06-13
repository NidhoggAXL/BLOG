import type { PoolConnection } from "mysql2/promise";

type DirectoryRow = {
  id: number;
  parent_id: number | null;
  slug: string;
};

/** 目录 id → 路径型 slug 前缀，如 aaaa/ccc（用 directories.slug 段） */
export async function directoryPathSlugById(
  executor: { query: PoolConnection["query"] },
  directoryId: number | null,
): Promise<string> {
  if (directoryId == null) return "";

  const [rows] = await executor.query(
    "SELECT id, parent_id, slug FROM directories",
  );
  const byId = new Map<number, DirectoryRow>();
  for (const row of rows as DirectoryRow[]) {
    byId.set(row.id, row);
  }

  const segs: string[] = [];
  const seen = new Set<number>();
  let cur: number | null = directoryId;
  while (cur != null && !seen.has(cur)) {
    seen.add(cur);
    const row = byId.get(cur);
    if (!row) break;
    segs.push(row.slug);
    cur = row.parent_id;
  }
  return segs.reverse().join("/");
}

/** 路径型 slug 是否位于指定目录树下（同目录或子目录） */
export function pathSlugUnderDirectoryPrefix(
  slug: string,
  dirPrefix: string,
): boolean {
  const p = dirPrefix.trim().replace(/\/+$/, "");
  if (!p) return true;
  const lower = slug.toLowerCase();
  const pref = p.toLowerCase();
  return lower === pref || lower.startsWith(`${pref}/`);
}
