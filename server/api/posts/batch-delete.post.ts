import { batchDeletePosts } from '../../utils/post-batch-delete'

type Body = {
  slugs?: string[]
  directory_id?: number
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const body = (await readBody<Body>(event)) ?? {}
  const slugs = Array.isArray(body.slugs)
    ? body.slugs.map((s) => String(s).trim()).filter(Boolean)
    : undefined
  const directoryId =
    body.directory_id != null ? Number(body.directory_id) : undefined

  if (directoryId == null && (!slugs || slugs.length === 0)) {
    throw createError({
      statusCode: 400,
      message: '请提供 slugs 或 directory_id',
    })
  }

  if (directoryId != null && !Number.isFinite(directoryId)) {
    throw createError({ statusCode: 400, message: 'directory_id 无效' })
  }

  const pool = useMysqlPool()
  try {
    return await batchDeletePosts(pool, { slugs, directory_id: directoryId })
  } catch (e: unknown) {
    const err = e as { statusCode?: number; statusMessage?: string; sqlMessage?: string }
    if (err.statusCode) throw e
    throw createError({
      statusCode: 500,
      message: err.sqlMessage || '批量删除失败',
    })
  }
})
