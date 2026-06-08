/** 文章 title 与 slug 使用同一字符串（文件名去后缀或用户输入） */
export function postTitleAndSlug(raw: string): { title: string; slug: string } {
  const s = raw.trim().slice(0, 191) || '未命名'
  return { title: s, slug: s }
}

/** slug 与 title 相同 */
export function postSlugFromTitle(title: string): string {
  return postTitleAndSlug(title).slug
}
