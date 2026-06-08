import { buildGraphData } from '../../utils/graph'
import { requireMysqlFromEvent } from '../../utils/posts'

export default defineEventHandler(async (event) => {
  const { pool } = requireMysqlFromEvent(event)
  const query = getQuery(event)
  const showOrphans = query.showOrphans !== 'false' && query.show_orphans !== 'false'

  return buildGraphData(pool, { showOrphans })
})
