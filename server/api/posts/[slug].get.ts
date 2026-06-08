import { getPostDetail, requireMysqlFromEvent } from '../../utils/posts'

export default defineEventHandler(async (event) => {
  const { config, pool } = requireMysqlFromEvent(event)
  const slug = String(getRouterParam(event, 'slug') ?? '').trim()
  if (!slug) {
    throw createError({ statusCode: 400, message: '缺少 slug' })
  }

  const row = await getPostDetail(pool, slug, {
    linkBasePath: config.adminWikilinkBasePath || '/admin/posts',
  })
  if (!row) {
    throw createError({ statusCode: 404, message: '文章不存在' })
  }

  return row
})
