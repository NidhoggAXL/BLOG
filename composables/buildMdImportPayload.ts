/** 从 .md 文件内容构建新建文章导入载荷（文件名去后缀 = 标题 = slug） */

import { fileStemFromName } from '~/composables/inferPostImportFromMarkdown'

import { postTitleAndSlug } from '~/utils/postSlug'



export type MdImportPayload = {

  title: string

  body: string

  slug: string

  fileName: string

}



export function buildMdImportPayload(fileName: string, text: string): MdImportPayload {

  const stem = fileStemFromName(fileName)

  const { title, slug } = postTitleAndSlug(stem)

  return { title, body: text, slug, fileName }

}

