import type { GraphData, GraphEdge, GraphNode } from "../../types/graph";

type PostRow = {
  id: number;
  slug: string;
  title: string;
  directory_id: number | null;
  created_at: string;
};

type DirectoryRow = { id: number; parent_id: number | null; name: string };

type EdgeRow = {
  source_post_id: number;
  target_post_id: number;
  link_kind: "link" | "embed";
};

async function wikilinksTableExists(
  pool: ReturnType<typeof useMysqlPool>,
): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'post_wikilinks' LIMIT 1`,
  );
  return Array.isArray(rows) && rows.length > 0;
}

export async function buildGraphData(
  pool: ReturnType<typeof useMysqlPool>,
  opts?: { showOrphans?: boolean; publishedOnly?: boolean },
): Promise<GraphData> {
  const showOrphans = opts?.showOrphans !== false;
  const publishedOnly = opts?.publishedOnly === true;

  const postWhere = publishedOnly ? " WHERE status = 'published'" : "";
  const [postRows] = await pool.query(
    `SELECT id, slug, title, directory_id, created_at FROM posts${postWhere} ORDER BY title ASC`,
  );
  const posts = postRows as PostRow[];
  const [directoryRows] = await pool.query(
    "SELECT id, parent_id, name FROM directories ORDER BY id ASC",
  );
  const directories = directoryRows as DirectoryRow[];
  const dirById = new Map<number, DirectoryRow>();
  for (const d of directories) dirById.set(d.id, d);

  const pathCache = new Map<number, string>();
  function directoryPathById(id: number | null): string {
    if (id == null) return "未归类";
    const cached = pathCache.get(id);
    if (cached) return cached;
    const names: string[] = [];
    const seen = new Set<number>();
    let cur: number | null = id;
    while (cur != null && !seen.has(cur)) {
      seen.add(cur);
      const row = dirById.get(cur);
      if (!row) break;
      names.push(row.name);
      cur = row.parent_id;
    }
    const path = names.reverse().join(" / ") || "未归类";
    pathCache.set(id, path);
    return path;
  }

  const inDegree = new Map<number, number>();
  const outDegree = new Map<number, number>();
  const connected = new Set<number>();
  const edges: GraphEdge[] = [];

  if (await wikilinksTableExists(pool)) {
    const [edgeRows] = await pool.query(
      `SELECT source_post_id, target_post_id, link_kind
       FROM post_wikilinks
       WHERE resolve_status = 'ok' AND target_post_id IS NOT NULL`,
    );
    const edgeKeys = new Set<string>();
    for (const row of edgeRows as EdgeRow[]) {
      const source = row.source_post_id;
      const target = row.target_post_id;
      const key = `${source}\t${target}\t${row.link_kind}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ source, target, link_kind: row.link_kind });
      connected.add(source);
      connected.add(target);
      outDegree.set(source, (outDegree.get(source) ?? 0) + 1);
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
    }
  }

  const nodes: GraphNode[] = [];
  let orphanCount = 0;

  for (const p of posts) {
    const in_d = inDegree.get(p.id) ?? 0;
    const out_d = outDegree.get(p.id) ?? 0;
    const degree = in_d + out_d;
    const is_orphan = !connected.has(p.id);
    if (is_orphan) orphanCount++;
    if (!showOrphans && is_orphan) continue;
    nodes.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      directory_path: directoryPathById(p.directory_id),
      created_at: p.created_at,
      in_degree: in_d,
      out_degree: out_d,
      degree,
      is_orphan,
    });
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  return {
    nodes,
    edges: filteredEdges,
    meta: {
      node_count: nodes.length,
      edge_count: filteredEdges.length,
      orphan_count: orphanCount,
    },
  };
}
