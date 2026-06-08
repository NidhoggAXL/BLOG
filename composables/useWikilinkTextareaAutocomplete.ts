export type WikilinkLinkOption = {
  /** 插入 [[...]] 时使用的 slug */
  value: string
  /** 展示用标题（大字） */
  label: string
  /** 文章所在目录路径（小字，Obsidian 风格 `a/b/`） */
  directoryPath?: string
}

export type WikilinkAutocompleteContext = {
  /** `[[` 或 `![[` 的起始下标 */
  openIdx: number
  /** 查询串起始（`[[` 之后） */
  queryStart: number
  query: string
  isEmbed: boolean
  replaceEnd: number
}

/** 光标是否处于未闭合的 `[[...` / `![[...` 内（代码块内忽略） */
export function getWikilinkAutocompleteContext(
  text: string,
  cursor: number,
): WikilinkAutocompleteContext | null {
  if (cursor < 2) return null
  const masked = maskMarkdownForWikilinkScan(text.slice(0, cursor))
  const before = masked
  let searchFrom = before.length
  while (searchFrom > 0) {
    const openIdx = before.lastIndexOf('[[', searchFrom - 1)
    if (openIdx < 0) return null
    const isEmbed = openIdx > 0 && text[openIdx - 1] === '!'
    const queryStart = openIdx + 2
    if (cursor < queryStart) {
      searchFrom = openIdx
      continue
    }
    const segment = text.slice(queryStart, cursor)
    if (segment.includes(']]')) {
      searchFrom = openIdx
      continue
    }
    return {
      openIdx: isEmbed ? openIdx - 1 : openIdx,
      queryStart,
      query: segment,
      isEmbed,
      replaceEnd: cursor,
    }
  }
  return null
}

export function filterWikilinkLinkOptions(
  options: WikilinkLinkOption[],
  query: string,
  excludeSlugs: Set<string>,
  limit = 12,
): WikilinkLinkOption[] {
  const q = query.trim().toLowerCase()
  const scored: { opt: WikilinkLinkOption; score: number }[] = []
  for (const opt of options) {
    if (excludeSlugs.has(opt.value)) continue
    const slug = opt.value.toLowerCase()
    const label = opt.label.toLowerCase()
    const path = (opt.directoryPath ?? '').toLowerCase()
    let score = 0
    if (!q) {
      score = 1
    } else if (slug === q) {
      score = 100
    } else if (label === q) {
      score = 95
    } else if (slug.startsWith(q)) {
      score = 80
    } else if (label.startsWith(q)) {
      score = 75
    } else if (label.includes(q)) {
      score = 60
    } else if (path.includes(q)) {
      score = 50
    } else if (slug.includes(q)) {
      score = 40
    } else {
      continue
    }
    scored.push({ opt, score })
  }
  scored.sort((a, b) => b.score - a.score || a.opt.label.localeCompare(b.opt.label, 'zh-CN'))
  return scored.slice(0, limit).map((s) => s.opt)
}

export function buildWikilinkInsertText(
  slug: string,
  ctx: WikilinkAutocompleteContext,
): string {
  const inner = slug
  return ctx.isEmbed ? `![[${inner}]]` : `[[${inner}]]`
}

/** 将选中 slug 写入正文并返回新的光标位置 */
export function applyWikilinkAutocompleteSelection(
  text: string,
  ctx: WikilinkAutocompleteContext,
  slug: string,
): { text: string; cursor: number } {
  const insert = buildWikilinkInsertText(slug, ctx)
  const before = text.slice(0, ctx.openIdx)
  const after = text.slice(ctx.replaceEnd)
  const next = before + insert + after
  const cursor = before.length + insert.length
  return { text: next, cursor }
}
