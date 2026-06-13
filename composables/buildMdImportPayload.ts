/** 从 .md 文件内容构建新建文章导入载荷（slug 保留前缀，title 去前缀） */

import { fileStemFromName } from '~/composables/inferPostImportFromMarkdown'
import { formatPublicDisplayName } from '~/utils/obsidianDisplayPrefix'
import {
  buildPathSlugFromArchivePath,
  fileStemFromArchivePath,
} from '~/utils/pathSlug'

export type MdImportPayload = {
  title: string
  body: string
  slug: string
  fileName: string
}

export function buildMdImportPayload(
  fileName: string,
  text: string,
  options?: { path?: string; archiveDepth?: number },
): MdImportPayload {
  const path = options?.path ?? fileName
  const depth = options?.archiveDepth ?? 0
  const stem = path.includes('/')
    ? fileStemFromArchivePath(path)
    : fileStemFromName(fileName)
  const slug = path.includes('/')
    ? buildPathSlugFromArchivePath(path, depth)
    : buildPathSlugFromArchivePath(fileName, 0)
  const title = formatPublicDisplayName(stem, stem || '未命名')
  return { title, body: text, slug, fileName }
}
