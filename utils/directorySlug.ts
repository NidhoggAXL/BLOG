/** 目录 name 与 slug 使用同一字符串（解析/导入的文件夹名或用户输入） */
export function directoryNameAndSlug(raw: string): { name: string; slug: string } {
  const s = raw.trim().slice(0, 191) || 'folder'
  return { name: s, slug: s }
}

/** slug 与 name 相同；保留此函数供现有调用方使用 */
export function directorySlugFromName(name: string): string {
  return directoryNameAndSlug(name).slug
}
