import type { DashboardData } from '../../../types/dashboard'
import { fetchDashboardStats } from '../../utils/dashboardStats'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const pool = useMysqlPool()
  const payload: DashboardData = await fetchDashboardStats(pool)
  return payload
})
