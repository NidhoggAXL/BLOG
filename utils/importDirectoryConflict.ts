import { directorySegmentsForFile, type ImportMdFile } from '~/composables/parseImportArchive'
import { directoryNameAndSlug } from './directorySlug'
import type { DirectoryRow } from '~/types/directory'

export type ImportTopLevelDirConflict = {
  importName: string
  existingName: string
  slug: string
}

/** 导入将创建的首层目录名（按 archive_depth 截取后的第一段） */
export function collectTopLevelImportDirectoryNames(
  files: ImportMdFile[],
  archiveDepth: number,
): string[] {
  const names = new Set<string>()
  for (const f of files) {
    const segs = directorySegmentsForFile(f.path, archiveDepth)
    if (segs.length > 0) names.add(segs[0]!)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

/** 检测导入首层目录是否与目标父级下已有子目录 slug 冲突 */
export function detectTopLevelDirectoryConflicts(
  flatDirs: DirectoryRow[],
  importTopNames: string[],
  parentDirectoryId: number | null,
): ImportTopLevelDirConflict[] {
  const existing = flatDirs.filter((d) => (d.parent_id ?? null) === parentDirectoryId)
  const bySlug = new Map(existing.map((d) => [d.slug.toLowerCase(), d]))

  const conflicts: ImportTopLevelDirConflict[] = []
  for (const importName of importTopNames) {
    const { slug } = directoryNameAndSlug(importName)
    const hit = bySlug.get(slug.toLowerCase())
    if (hit) {
      conflicts.push({ importName, existingName: hit.name, slug })
    }
  }
  return conflicts
}

export const IMPORT_TOP_DIR_CONFLICT_MESSAGE =
  '请重新修改目录，和已经存在的顶层目录冲突。'

export function formatTopLevelDirConflictDetail(conflicts: ImportTopLevelDirConflict[]): string {
  if (!conflicts.length) return IMPORT_TOP_DIR_CONFLICT_MESSAGE
  const parts = conflicts.map(
    (c) => `「${c.importName}」与已有目录「${c.existingName}」`,
  )
  return `${IMPORT_TOP_DIR_CONFLICT_MESSAGE}\n\n${parts.join('\n')}`
}
