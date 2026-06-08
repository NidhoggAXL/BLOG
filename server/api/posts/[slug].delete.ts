import type { PostDeleteResult } from '../../../types/post'
import { fetchPostBySlug } from '../../utils/post-mutate'
import { countWikilinkEdges, getInboundWikilinks, markInboundWikilinksMissing } from '../../utils/wikilinks'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const slug = String(getRouterParam(event, 'slug') ?? '').trim()
  if (!slug) {
    throw createError({ statusCode: 400, message: '缺少 slug' })
  }

  const pool = useMysqlPool()
  const conn = await pool.getConnection()

  try {
    const post = await fetchPostBySlug(conn, slug)
    if (!post) {
      throw createError({ statusCode: 404, message: '文章不存在' })
    }

    const counts = await countWikilinkEdges(conn, post.id)
    const backlinks = await getInboundWikilinks(conn, post.id)

    await conn.beginTransaction()
    const inbound_marked_missing = await markInboundWikilinksMissing(conn, post.id)
    await conn.query('DELETE FROM posts WHERE id = ?', [post.id])
    await conn.commit()

    const result: PostDeleteResult = {
      deleted: true,
      slug: post.slug,
      title: post.title,
      outbound_links_removed: counts.outbound,
      inbound_links_affected: counts.inbound,
      inbound_marked_missing,
      backlinks_affected: backlinks.map((b) => ({
        source_slug: b.source_slug,
        source_title: b.source_title,
        link_kind: b.link_kind,
        raw_target: b.raw_target,
      })),
    }
    return result
  } catch (e: unknown) {
    await conn.rollback()
    const err = e as { statusCode?: number; statusMessage?: string; sqlMessage?: string }
    if (err.statusCode) throw e
    throw createError({
      statusCode: 500,
      message: err.sqlMessage || '删除文章失败',
    })
  } finally {
    conn.release()
  }
})
