import { createError } from 'h3'
import type { PoolConnection } from 'mysql2/promise'
import { buildManualPostPathSlug } from '../../utils/postPathSlug'
import { directoryPathSlugById } from './directory-path-slug'

type DbExecutor = { query: PoolConnection['query'] }

/** 手动创建/更新文章：生成路径 slug，并校验同级不可重名（Obsidian 规则） */
export async function resolveManualPostSlug(
  executor: DbExecutor,
  directoryId: number | null,
  rawTitle: string,
  excludePostId?: number,
): Promise<{ title: string; slug: string }> {
  const dirPrefix = await directoryPathSlugById(executor, directoryId)
  const { title, slug, stem } = buildManualPostPathSlug(dirPrefix, rawTitle)

  const siblingParams: (string | number | null)[] = [
    directoryId,
    stem.toLowerCase(),
    `%/${stem.toLowerCase()}`,
  ]
  let siblingSql = `SELECT id, slug FROM posts WHERE directory_id <=> ?
    AND (LOWER(slug) = ? OR LOWER(slug) LIKE ?)`
  if (excludePostId != null) {
    siblingSql += ' AND id <> ?'
    siblingParams.push(excludePostId)
  }
  siblingSql += ' LIMIT 1'

  const [siblingRows] = await executor.query(siblingSql, siblingParams)
  const sibling = (siblingRows as { id: number; slug: string }[])[0]
  if (sibling) {
    throw createError({
      statusCode: 409,
      message:
        directoryId != null
          ? `该目录下已存在同名笔记「${stem}」（${sibling.slug}），请更换标题`
          : `文库根目录下已存在同名笔记「${stem}」，请更换标题`,
    })
  }

  const slugParams: (string | number)[] = [slug.toLowerCase()]
  let slugSql = 'SELECT id FROM posts WHERE LOWER(slug) = ?'
  if (excludePostId != null) {
    slugSql += ' AND id <> ?'
    slugParams.push(excludePostId)
  }
  slugSql += ' LIMIT 1'

  const [dupRows] = await executor.query(slugSql, slugParams)
  if ((dupRows as { id: number }[])[0]) {
    throw createError({
      statusCode: 409,
      message: `路径 slug「${slug}」已被占用，请调整标题或所属目录`,
    })
  }

  return { title, slug }
}
