import { IMPORT_BATCH_MAX_FILES } from "../../../constants/post-import";
import type { ImportBatchFileInput } from "../../utils/import-batch";
import {
  findTopLevelDirectoryConflicts,
  runImportBatch,
} from "../../utils/import-batch";

function normalizeDirectoryId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

type PostStatus = "draft" | "published" | "archived";

function normalizeStatus(raw: unknown): PostStatus {
  const s = String(raw ?? "draft").toLowerCase();
  if (s === "published" || s === "archived" || s === "draft") return s;
  return "draft";
}

function normalizeZipPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function normalizeWikilinkSlugsByPath(
  raw: unknown,
  filePaths: string[],
): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const validPaths = new Set(filePaths.map(normalizeZipPath));
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const path = normalizeZipPath(String(key));
    if (!validPaths.has(path) || !Array.isArray(value)) continue;
    const slugs = value
      .map((s) => String(s).trim())
      .filter(Boolean);
    if (slugs.length) out[path] = slugs;
  }
  return out;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  if (!config.mysqlDatabase) {
    throw createError({
      statusCode: 503,
      message: "请在 .env 中配置 MYSQL_DATABASE",
    });
  }

  const body = await readBody<{
    parent_directory_id?: number | null;
    archive_depth?: number;
    status?: string;
    wikilink_target_slugs?: string[];
    wikilink_slugs_by_path?: Record<string, string[]>;
    files?: ImportBatchFileInput[];
  }>(event);

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) {
    throw createError({
      statusCode: 400,
      message: "没有可导入的 Markdown 文件",
    });
  }
  if (files.length > IMPORT_BATCH_MAX_FILES) {
    throw createError({
      statusCode: 400,
      message: `单次最多导入 ${IMPORT_BATCH_MAX_FILES} 个文件（当前 ${files.length} 个）`,
    });
  }

  for (const f of files) {
    if (!f?.path || typeof f.body !== "string") {
      throw createError({
        statusCode: 400,
        message: "files 项需包含 path 与 body",
      });
    }
  }

  const parentDirectoryId = normalizeDirectoryId(body.parent_directory_id);
  const archiveDepth = Math.max(0, Math.floor(Number(body.archive_depth) || 0));
  const status = normalizeStatus(body.status);
  const wikilinkTargetSlugs = Array.isArray(body.wikilink_target_slugs)
    ? body.wikilink_target_slugs.map(String)
    : [];
  const wikilinkSlugsByPath = normalizeWikilinkSlugsByPath(
    body.wikilink_slugs_by_path,
    files.map((f) => f.path),
  );
  const pool = useMysqlPool();
  const conn = await pool.getConnection();

  try {
    if (parentDirectoryId != null) {
      const [drows] = await conn.query(
        "SELECT id FROM directories WHERE id = ? LIMIT 1",
        [parentDirectoryId],
      );
      if (!(Array.isArray(drows) && drows.length)) {
        throw createError({ statusCode: 400, message: "所选父目录不存在" });
      }
    }

    const dirConflicts = await findTopLevelDirectoryConflicts(
      conn,
      files,
      parentDirectoryId,
      archiveDepth,
    );
    if (dirConflicts.length) {
      const detail = dirConflicts
        .map((c) => `「${c.importName}」与已有目录「${c.existingName}」`)
        .join("；");
      throw createError({
        statusCode: 409,
        message: `请重新修改目录，和已经存在的顶层目录冲突。${detail}`,
      });
    }

    await conn.beginTransaction();
    const result = await runImportBatch(conn, files, {
      parentDirectoryId,
      archiveDepth,
      status,
      wikilinkTargetSlugs,
      wikilinkSlugsByPath,
    });
    await conn.commit();
    return result;
  } catch (e: unknown) {
    await conn.rollback();
    const err = e as {
      statusCode?: number;
      statusMessage?: string;
      code?: string;
      errno?: number;
      sqlMessage?: string;
    };
    if (err.statusCode) throw e;
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      throw createError({
        statusCode: 409,
        message: "slug 或目录 slug 冲突，请调整压缩包路径或 slug 策略",
      });
    }
    throw createError({
      statusCode: 500,
      message:
        err.sqlMessage || (err instanceof Error ? err.message : "批量导入失败"),
    });
  } finally {
    conn.release();
  }
});
