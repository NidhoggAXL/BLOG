import type { WikilinkLinkOption } from '~/composables/useWikilinkTextareaAutocomplete'
import type { WikilinkParseLink } from '~/types/wikilink'

export type WikilinkParseTableRow = WikilinkParseLink & {
  /** 命中目标文章所在目录路径（Obsidian 风格） */
  target_directory_path?: string
  /** 批量导入时：该双链出自哪个 md 文件路径 */
  source_path?: string
}

export function wikilinkResolveStatusLabel(
  status: WikilinkParseLink['resolve_status'],
): string {
  if (status === 'ok') return '已命中'
  if (status === 'missing_target') return '未命中'
  if (status === 'ambiguous') return '歧义'
  return '仅语法'
}

export function wikilinkResolveStatusTagType(
  status: WikilinkParseLink['resolve_status'],
): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'ok') return 'success'
  if (status === 'missing_target') return 'warning'
  if (status === 'ambiguous') return 'danger'
  return 'info'
}

export function wikilinkLinkKindLabel(kind: WikilinkParseLink['link_kind']): string {
  return kind === 'embed' ? '嵌入' : '链接'
}

/** 为解析结果补上命中文章的目录路径 */
export function enrichWikilinkParseRows(
  links: WikilinkParseLink[],
  linkOptions: WikilinkLinkOption[],
): WikilinkParseTableRow[] {
  const bySlug = new Map(linkOptions.map((o) => [o.value.toLowerCase(), o]))
  return links.map((link) => {
    const primarySlug = link.target_slug?.split(',')[0]?.trim()
    const opt = primarySlug ? bySlug.get(primarySlug.toLowerCase()) : undefined
    return {
      ...link,
      target_directory_path: opt?.directoryPath,
    }
  })
}
