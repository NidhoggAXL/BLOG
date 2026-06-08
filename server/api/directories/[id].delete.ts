import { deleteDirectoryWithPosts } from '../../utils/delete-directory'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id < 1) {
    throw createError({ statusCode: 400, message: '无效的目录 id' })
  }

  const pool = useMysqlPool()
  return deleteDirectoryWithPosts(pool, id)
})
