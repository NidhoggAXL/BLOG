import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader } from "mysql2";
import { findSiblingDirectoryByName } from "./directory-sibling-uniqueness";
import { directoryNameAndSlug } from "../../utils/directorySlug";
import {
  formatPublicDisplayName,
  obsidianOrderFromSegment,
} from "../../utils/obsidianDisplayPrefix";
import {
  buildPathSlugFromArchivePath,
  fileStemFromArchivePath,
} from "../../utils/pathSlug";
import {
  buildImportBatchWikilinkLookup,
  mergeWikilinkSlugsIntoBody,
  stripMergedOutboundWikilinkBlock,
  syncPostWikilinks,
} from "./wikilinks";

export type ImportBatchFileInput = {
  path: string;
  title: string;
  body: string;
  slug?: string;
};

export type ImportBatchOptions = {
  parentDirectoryId: number | null;
  archiveDepth: number;
  status: "draft" | "published" | "archived";
  /** 手动多选：写入每一篇正文 */
  wikilinkTargetSlugs: string[];
  /** AI 或逐篇采纳：仅写入对应 path 的正文 */
  wikilinkSlugsByPath?: Record<string, string[]>;
};

export type ImportBatchOutcome = {
  directories_created: number;
  posts_created: number;
  post_slugs: string[];
  warnings: string[];
};

export type TopLevelDirConflict = {
  importName: string;
  existingName: string;
};

function topLevelImportDirNames(
  files: ImportBatchFileInput[],
  depth: number,
): string[] {
  const names = new Set<string>();
  for (const file of files) {
    const segs = dirSegmentsForPath(file.path, depth);
    if (segs.length > 0) names.add(segs[0]!);
  }
  return [...names];
}

/** 导入首层目录是否与目标父级下已有目录 slug 冲突 */
export async function findTopLevelDirectoryConflicts(
  conn: PoolConnection,
  files: ImportBatchFileInput[],
  parentDirectoryId: number | null,
  archiveDepth: number,
): Promise<TopLevelDirConflict[]> {
  const names = topLevelImportDirNames(
    files,
    Math.max(0, Math.floor(archiveDepth)),
  );
  if (!names.length) return [];

  const [rows] = await conn.query(
    "SELECT name, slug FROM directories WHERE parent_id <=> ?",
    [parentDirectoryId],
  );
  const existing = rows as { name: string; slug: string }[];
  const bySlug = new Map(existing.map((d) => [d.slug.toLowerCase(), d]));

  const conflicts: TopLevelDirConflict[] = [];
  for (const importName of names) {
    const { name: importDirName, slug } = directoryNameAndSlug(importName);
    const hit = bySlug.get(slug.toLowerCase());
    if (hit) conflicts.push({ importName: importDirName, existingName: hit.name });
  }
  return conflicts;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function dirSegmentsForPath(path: string, depth: number): string[] {
  const segs = normalizePath(path).split("/").filter(Boolean);
  if (segs.length <= 1) return [];
  return segs.slice(depth, -1);
}

function uniqueStringKey(
  base: string,
  used: Set<string>,
  fallback = "未命名",
): string {
  const keyOf = (s: string) => s.toLowerCase();
  let s = base.slice(0, 191) || fallback;
  if (!used.has(keyOf(s))) {
    used.add(keyOf(s));
    return s;
  }
  let i = 2;
  while (i < 10000) {
    const candidate = `${base.slice(0, 180)}-${i}`.slice(0, 191);
    if (!used.has(keyOf(candidate))) {
      used.add(keyOf(candidate));
      return candidate;
    }
    i++;
  }
  const unique = `post-${Date.now()}`.slice(0, 191);
  used.add(keyOf(unique));
  return unique;
}

function assignPathSlug(slug: string, usedSlugs: Set<string>): string {
  const key = slug.toLowerCase();
  if (usedSlugs.has(key)) {
    throw new Error(
      `路径 slug 已存在：「${slug}」。请调整压缩包路径、目录层级起点，或删除库中同名文章。`,
    );
  }
  usedSlugs.add(key);
  return slug;
}

function importPostMeta(
  path: string,
  depth: number,
  usedSlugs: Set<string>,
  usedTitles: Set<string>,
): { title: string; slug: string; stem: string } {
  const stem = fileStemFromArchivePath(path);
  const slug = assignPathSlug(
    buildPathSlugFromArchivePath(path, depth),
    usedSlugs,
  );
  const titleBase = formatPublicDisplayName(stem, stem || "未命名");
  const title = uniqueStringKey(titleBase, usedTitles);
  return { title, slug, stem };
}

async function findDirectoryUnderParent(
  conn: PoolConnection,
  parentId: number | null,
  slug: string,
): Promise<number | null> {
  const [rows] = await conn.query(
    "SELECT id FROM directories WHERE parent_id <=> ? AND slug = ? LIMIT 1",
    [parentId, slug],
  );
  const list = rows as { id: number }[];
  return list[0]?.id ?? null;
}

async function ensureDirectoryPath(
  conn: PoolConnection,
  parentId: number | null,
  segments: string[],
  cache: Map<string, number>,
  stats: { created: number },
): Promise<number | null> {
  let currentParent = parentId;
  let pathKey = parentId == null ? "@root" : `@${parentId}`;

  for (const seg of segments) {
    const { name, slug } = directoryNameAndSlug(seg);
    pathKey = `${pathKey}/${name}`;

    const cached = cache.get(pathKey);
    if (cached != null) {
      currentParent = cached;
      continue;
    }

    let dirId = await findDirectoryUnderParent(conn, currentParent, slug);
    if (dirId == null) {
      const nameConflict = await findSiblingDirectoryByName(conn, currentParent, name);
      if (nameConflict) {
        throw new Error(
          `目录「${name}」在同一父级下已存在，请调整压缩包路径或先合并目录`,
        );
      }
      const sortOrder = obsidianOrderFromSegment(seg) ?? 0;
      const [res] = await conn.query<ResultSetHeader>(
        "INSERT INTO directories (parent_id, name, slug, sort_order) VALUES (?, ?, ?, ?)",
        [currentParent, name, slug, sortOrder],
      );
      dirId = res.insertId;
      stats.created++;
    }
    cache.set(pathKey, dirId);
    currentParent = dirId;
  }

  return currentParent;
}

export async function runImportBatch(
  conn: PoolConnection,
  files: ImportBatchFileInput[],
  options: ImportBatchOptions,
): Promise<ImportBatchOutcome> {
  const warnings: string[] = [];
  const post_slugs: string[] = [];
  const usedSlugs = new Set<string>();
  const usedTitles = new Set<string>();
  const dirCache = new Map<string, number>();
  const dirStats = { created: 0 };

  const existingSlugRows = await conn.query("SELECT slug FROM posts");
  const slugRows = existingSlugRows[0] as { slug: string }[];
  for (const r of slugRows) {
    usedSlugs.add(r.slug.toLowerCase());
  }

  const existingTitleRows = await conn.query("SELECT title FROM posts");
  const titleRows = existingTitleRows[0] as { title: string }[];
  for (const r of titleRows) {
    usedTitles.add(r.title.toLowerCase());
  }

  const depth = Math.max(0, Math.floor(options.archiveDepth));
  const globalExplicitSlugs = options.wikilinkTargetSlugs
    .map((s) => String(s).trim())
    .filter(Boolean);
  const slugsByPath = options.wikilinkSlugsByPath ?? {};
  const imported: {
    id: number;
    slug: string;
    title: string;
    body: string;
    stem: string;
    directory_id: number | null;
  }[] = [];

  for (const file of files) {
    const path = normalizePath(file.path);
    if (!path) continue;

    const dirSegs = dirSegmentsForPath(path, depth);
    let directoryId = options.parentDirectoryId;

    if (dirSegs.length) {
      const ensured = await ensureDirectoryPath(
        conn,
        options.parentDirectoryId,
        dirSegs,
        dirCache,
        dirStats,
      );
      directoryId = ensured;
    }

    const { title, slug, stem } = importPostMeta(
      path,
      depth,
      usedSlugs,
      usedTitles,
    );
    const rawBody = stripMergedOutboundWikilinkBlock(
      typeof file.body === "string" ? file.body : "",
    );
    const perFileSlugs = (slugsByPath[path] ?? [])
      .map((s) => String(s).trim())
      .filter(Boolean);
    const mergeSlugs = [...globalExplicitSlugs, ...perFileSlugs];
    // 全局多选 + 逐篇 AI 采纳：merge 进正文；边表仍只按本篇正文解析
    const body = mergeSlugs.length
      ? mergeWikilinkSlugsIntoBody(rawBody, mergeSlugs)
      : rawBody;

    const publishedAt = options.status === "published" ? new Date() : null;

    const [res] = await conn.query<ResultSetHeader>(
      "INSERT INTO posts (directory_id, slug, title, body, status, published_at) VALUES (?, ?, ?, ?, ?, ?)",
      [directoryId, slug, title, body, options.status, publishedAt],
    );

    const postId = res.insertId;
    imported.push({ id: postId, slug, title, body, stem, directory_id: directoryId });
    post_slugs.push(slug);
  }

  const batchLookup = buildImportBatchWikilinkLookup(imported);

  for (const row of imported) {
    // 边表仅来自该篇正文（含用户勾选后 merge 进正文的 [[slug]]），勿把全局 slug 列表注入每一篇
    const syncResult = await syncPostWikilinks(conn, row.id, row.body, [], {
      batchLookup,
    });
    if (syncResult.skipped && syncResult.skipReason === "no_table") {
      warnings.push(`《${row.title}》：未创建 post_wikilinks 表，双链边未写入`);
    }
  }

  if (files.length > 0 && post_slugs.length === 0) {
    throw new Error(
      "未能写入任何文章，请检查压缩包内路径与「目录层级起点」设置",
    );
  }

  return {
    directories_created: dirStats.created,
    posts_created: post_slugs.length,
    post_slugs,
    warnings: [...new Set(warnings)],
  };
}
