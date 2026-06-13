import type { DirectoryRow } from '~/types/directory'
import { obsidianOrderFromSegment } from './obsidianDisplayPrefix'
import { pathSlugStem } from './pathSlug'
import { postTitleAndSlug } from './postSlug'

/** 由扁平目录表构建路径型 slug 前缀（与 server directoryPathSlugById 一致，用 directories.slug） */
export function directoryPathSlugFromFlat(
  flat: Pick<DirectoryRow, 'id' | 'parent_id' | 'slug'>[],
  directoryId: number | null | undefined,
): string {
  if (directoryId == null || directoryId === 0) return ''

  const byId = new Map(flat.map((r) => [r.id, r]))
  const segs: string[] = []
  const seen = new Set<number>()
  let cur: number | null = directoryId

  while (cur != null && !seen.has(cur)) {
    seen.add(cur)
    const row = byId.get(cur)
    if (!row) break
    segs.push(row.slug)
    cur = row.parent_id
  }

  return segs.reverse().join('/')
}

/**
 * 手动创建/编辑：Obsidian 式路径 slug = 目录路径 + 标题 stem
 * 标题即文件名（去 .md 后的 stem），与导入规则一致。
 */
export function buildManualPostPathSlug(
  directoryPathSlug: string,
  rawTitle: string,
): { title: string; slug: string; stem: string } {
  const { title, slug: stem } = postTitleAndSlug(rawTitle)
  const prefix = directoryPathSlug.trim().replace(/\/+$/, '')
  const slug = (prefix ? `${prefix}/${stem}` : stem).slice(0, 191)
  return { title, slug, stem }
}

/** 从文件名 stem 或 slug 末段解析 Obsidian 排序数字，无前缀则为 null */
export function postSortOrderFromStem(stem: string): number | null {
  return obsidianOrderFromSegment(stem)
}

export function postSortOrderFromSlug(slug: string): number {
  return postSortOrderFromStem(pathSlugStem(slug))
}
