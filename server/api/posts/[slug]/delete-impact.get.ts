import type { PostDeleteImpact } from '../../../../types/post'
import { fetchPostBySlug } from '../../../utils/post-mutate'
import { resolveAdminPostSlugFromEvent } from '../../../utils/post-slug-param'
import { countWikilinkEdges, getInboundWikilinks } from '../../../utils/wikilinks'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const slug = resolveAdminPostSlugFromEvent(event)
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

    const impact: PostDeleteImpact = {
      post_id: post.id,
      slug: post.slug,
      title: post.title,
      outbound_links: counts.outbound,
      inbound_links: counts.inbound,
      backlinks: backlinks.map((b) => ({
        source_slug: b.source_slug,
        source_title: b.source_title,
        link_kind: b.link_kind,
        raw_target: b.raw_target,
      })),
    }
    return impact
  } finally {
    conn.release()
  }
})
