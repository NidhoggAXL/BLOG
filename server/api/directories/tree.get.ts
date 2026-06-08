import { listAllDirectories } from '../../utils/directories'
import { requireMysqlFromEvent } from '../../utils/posts'

export default defineEventHandler(async (event) => {
  const { pool } = requireMysqlFromEvent(event)
  const list = await listAllDirectories(pool)
  return { list }
})
