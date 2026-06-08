import type { PostDetail } from '../../../types/post'
import { renderPostBodyHtmlForPool } from '../../utils/render-post-body-html'
import { fetchPostBySlug, normalizeDirectoryId, normalizeStatus } from '../../utils/post-mutate'
import { postTitleAndSlug } from '../../../utils/postSlug'
import { queuePostEmbeddingsSync } from '../../utils/ai/embeddings'
import { getExplicitOutboundSlugs, syncPostWikilinks } from '../../utils/wikilinks'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const currentSlug = String(getRouterParam(event, 'slug') ?? '').trim()
  if (!currentSlug) {
    throw createError({ statusCode: 400, message: '缺少 slug' })
  }

  const body = await readBody<{
    title?: string
    directory_id?: number | null
    status?: string
    body?: string
    wikilink_target_slugs?: string[]
  }>(event)

  const rawTitle = (body.title ?? '').trim()
  if (!rawTitle) {
    throw createError({ statusCode: 400, message: '标题不能为空' })
  }

  const { title, slug: newSlug } = postTitleAndSlug(rawTitle)
  const directoryId = normalizeDirectoryId(body.directory_id)
  const status = normalizeStatus(body.status)
  const rawMarkdown = typeof body.body === 'string' ? body.body : ''
  const slugs = Array.isArray(body.wikilink_target_slugs) ? body.wikilink_target_slugs : []

  const pool = useMysqlPool()
  const conn = await pool.getConnection()

  try {
    const existing = await fetchPostBySlug(conn, currentSlug)
    if (!existing) {
      throw createError({ statusCode: 404, message: '文章不存在' })
    }

    if (directoryId != null) {
      const [drows] = await conn.query('SELECT id FROM directories WHERE id = ? LIMIT 1', [directoryId])
      if (!(Array.isArray(drows) && drows.length)) {
        throw createError({ statusCode: 400, message: '所选目录不存在，请刷新后重选' })
      }
    }

    if (newSlug !== existing.slug) {
      const [dup] = await conn.query('SELECT id FROM posts WHERE slug = ? AND id <> ? LIMIT 1', [
        newSlug,
        existing.id,
      ])
      if (Array.isArray(dup) && dup.length) {
        throw createError({ statusCode: 409, message: 'slug 已被其他文章占用' })
      }
    }

    await conn.beginTransaction()

    let publishedAt = existing.published_at
    if (status === 'published' && !publishedAt) {
      publishedAt = new Date() as unknown as string
    }

    await conn.query(
      `UPDATE posts SET directory_id = ?, slug = ?, title = ?, body = ?, status = ?, published_at = ?
       WHERE id = ?`,
      [directoryId, newSlug, title, rawMarkdown, status, publishedAt, existing.id],
    )

    const normalizedExplicit = slugs.map((s) => String(s).trim()).filter(Boolean)
    const syncResult = await syncPostWikilinks(conn, existing.id, rawMarkdown, normalizedExplicit)

    await conn.commit()

    queuePostEmbeddingsSync(pool, existing.id, event)

    const [rows] = await conn.query(
      'SELECT id, directory_id, slug, title, body, status, published_at, created_at, updated_at FROM posts WHERE id = ? LIMIT 1',
      [existing.id],
    )
    const updated = (rows as PostDetail[])[0]!
    const wikilink_target_slugs = await getExplicitOutboundSlugs(conn, existing.id)

    let body_html = ''
    try {
      body_html = await renderPostBodyHtmlForPool(pool, updated.body)
    } catch {
      body_html = ''
    }

    const warnings: string[] = []
    if (syncResult.skipped && syncResult.skipReason === 'no_table') {
      warnings.push(
        '当前数据库未创建 post_wikilinks 表，双链未同步。请执行 db/05-schema-post-wikilinks.sql 后重新保存。',
      )
    }
    if (newSlug !== existing.slug) {
      warnings.push(
        `slug 已从「${existing.slug}」改为「${newSlug}」。其他文章正文中若仍写 [[${existing.slug}]]，需自行修改或重新保存那些文章以更新边表。`,
      )
    }

    return {
      ...updated,
      body_html,
      wikilink_target_slugs,
      wikilink_edges_synced: syncResult.inserted,
      slug_changed: newSlug !== existing.slug,
      previous_slug: existing.slug,
      ...(warnings.length ? { warnings } : {}),
    }
  } catch (e: unknown) {
    await conn.rollback()
    const err = e as { statusCode?: number; statusMessage?: string; code?: string; errno?: number; sqlMessage?: string }
    if (err.statusCode) throw e
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      throw createError({ statusCode: 409, message: 'slug 已被占用，请修改路径或标题' })
    }
    throw createError({
      statusCode: 500,
      message: err.sqlMessage || '更新文章失败',
    })
  } finally {
    conn.release()
  }
})
