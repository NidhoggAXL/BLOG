import { listPosts, requireMysqlFromEvent } from '../../utils/posts'

export default defineEventHandler(async (event) => {
  const { pool } = requireMysqlFromEvent(event)
  const list = await listPosts(pool)
  return { list }
})
