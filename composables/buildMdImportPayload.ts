/** 从 .md 文件内容构建新建文章导入载荷（slug 保留前缀，title 去前缀） */

import { fileStemFromName } from '~/composables/inferPostImportFromMarkdown'
import { formatPublicDisplayName } from '~/utils/obsidianDisplayPrefix'
import { postTitleAndSlug } from '~/utils/postSlug'

export type MdImportPayload = {
  title: string
  body: string
  slug: string
  fileName: string
}

export function buildMdImportPayload(fileName: string, text: string): MdImportPayload {
  const stem = fileStemFromName(fileName)
  const { slug } = postTitleAndSlug(stem)
  const title = formatPublicDisplayName(stem, stem || '未命名')
  return { title, body: text, slug, fileName }
}
