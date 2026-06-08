import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

/** Nitro 内使用：从 runtimeConfig 读取 .env 注入的 MySQL 配置 */
export function useMysqlPool() {
  const config = useRuntimeConfig()
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysqlHost,
      port: config.mysqlPort,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase || undefined,
      waitForConnections: true,
      connectionLimit: 10,
    })
  }
  return pool
}
