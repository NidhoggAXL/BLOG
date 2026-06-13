import type { ResultSetHeader } from 'mysql2'
import { resolveManualPostSlug } from '../../utils/post-path-slug'
import { queuePostEmbeddingsSync } from '../../utils/ai/embeddings'
import { syncPostWikilinks } from '../../utils/wikilinks'

function normalizeDirectoryId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return null
  return n
}

type PostStatus = 'draft' | 'published' | 'archived'

function normalizeStatus(raw: unknown): PostStatus {
  const s = String(raw ?? 'draft').toLowerCase()
  if (s === 'published' || s === 'archived' || s === 'draft') return s
  return 'draft'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const body = await readBody<{
    title?: string
    directory_id?: number | null
    status?: string
    body?: string
    /** 额外勾选的双链目标（posts.slug），同步边表，不写入正文 */
    wikilink_target_slugs?: string[]
  }>(event)

  const rawTitle = (body.title ?? '').trim()
  if (!rawTitle) {
    throw createError({ statusCode: 400, message: '标题不能为空' })
  }

  const directoryId = normalizeDirectoryId(body.directory_id)
  const status = normalizeStatus(body.status)
  const rawMarkdown = typeof body.body === 'string' ? body.body : ''
  const slugs = Array.isArray(body.wikilink_target_slugs) ? body.wikilink_target_slugs : []

  const pool = useMysqlPool()
  const conn = await pool.getConnection()

  try {
    if (directoryId != null) {
      const [drows] = await conn.query<{ id: number }[]>(
        'SELECT id FROM directories WHERE id = ? LIMIT 1',
        [directoryId],
      )
      if (!(Array.isArray(drows) && drows.length)) {
        throw createError({ statusCode: 400, message: '所选目录不存在，请刷新后重选' })
      }
    }

    const { title, slug, sort_order } = await resolveManualPostSlug(conn, directoryId, rawTitle)

    await conn.beginTransaction()

    const publishedAt = status === 'published' ? new Date() : null

    const [res] = await conn.query<ResultSetHeader>(
      'INSERT INTO posts (directory_id, sort_order, slug, title, body, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [directoryId, sort_order, slug, title, rawMarkdown, status, publishedAt],
    )

    const insertId = res.insertId
    const normalizedExplicit = slugs.map((s) => String(s).trim()).filter(Boolean)
    const syncResult = await syncPostWikilinks(conn, insertId, rawMarkdown, normalizedExplicit)

    await conn.commit()

    queuePostEmbeddingsSync(pool, insertId, event)

    const warnings: string[] = []
    if (syncResult.skipped && syncResult.skipReason === 'no_table') {
      const bodyHasWikilink = /\[\[[^\]\n]+\]\]/.test(rawMarkdown) || /!\[\[[^\]\n]+\]\]/.test(rawMarkdown)
      if (normalizedExplicit.length > 0 || bodyHasWikilink) {
        warnings.push(
          '当前数据库未创建 post_wikilinks 表，双链未写入。请在库中执行 db/05-schema-post-wikilinks.sql 后重新编辑保存本篇，或手动 INSERT 边表。',
        )
      }
    }

    return {
      id: insertId,
      slug,
      title,
      directory_id: directoryId,
      status,
      wikilink_edges_inserted: syncResult.inserted,
      ...(warnings.length ? { warnings } : {}),
    }
  } catch (e: unknown) {
    await conn.rollback()
    const err = e as { statusCode?: number; statusMessage?: string; code?: string; errno?: number; sqlMessage?: string }
    if (err.statusCode) throw e
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      throw createError({
        statusCode: 409,
        message: '该目录下已存在同名笔记或路径 slug 已被占用，请更换标题',
        data: err.sqlMessage,
      })
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
      throw createError({ statusCode: 400, message: '目录或外键约束失败' })
    }
    throw createError({
      statusCode: 500,
      message: err.sqlMessage || '创建文章失败',
    })
  } finally {
    conn.release()
  }
})
