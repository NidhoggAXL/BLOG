import { formatPublicDisplayName, hasObsidianOrderPrefix } from './obsidianDisplayPrefix'

/** 从路径段或用户输入得到 slug（保留 Obsidian 前缀，trim 后截断） */
export function directorySlugFromSegment(raw: string): string {
  return raw.trim().slice(0, 191) || 'folder'
}

/** 导入目录：slug 保留原名，name 去掉排序前缀 */
export function directoryImportNameAndSlug(raw: string): { name: string; slug: string } {
  const slug = directorySlugFromSegment(raw)
  const name = formatPublicDisplayName(slug, slug)
  return { name, slug }
}

/** 手动创建/编辑：name 与 slug 相同（调用方须先校验无排序前缀） */
export function manualDirectoryNameAndSlug(raw: string): { name: string; slug: string } {
  const s = raw.trim().slice(0, 191) || 'folder'
  return { name: s, slug: s }
}

/** @deprecated 请使用 manualDirectoryNameAndSlug 或 directoryImportNameAndSlug */
export function directoryNameAndSlug(raw: string): { name: string; slug: string } {
  return manualDirectoryNameAndSlug(raw)
}

/** slug 与手动目录 name 相同 */
export function directorySlugFromName(name: string): string {
  return manualDirectoryNameAndSlug(name).slug
}

/** 手动目录名校验；含排序前缀时返回错误文案，否则 null */
export function manualDirectoryNameValidationError(raw: string): string | null {
  if (hasObsidianOrderPrefix(raw)) {
    return '目录名称请勿使用数字排序前缀（如 01_、01 ），请填写显示名称；排序请使用「排序」字段'
  }
  return null
}
