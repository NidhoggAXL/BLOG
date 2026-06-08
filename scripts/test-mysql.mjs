/**
 * 终端测试本地 MySQL：读取项目根目录 .env
 * 运行：npm run db:test
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadDotEnv() {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) {
    console.error('[db:test] 未找到 .env，请复制 .env.example 为 .env 并填写 MYSQL_*')
    process.exit(1)
  }
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!(k in process.env)) process.env[k] = v
  }
}

function explainMySqlError(err) {
  const code = err.code
  const errno = err.errno
  const sqlState = err.sqlState
  const msg = err.message || String(err)

  const lines = ['', '--- 错误说明 ---', `message: ${msg}`]
  if (code != null) lines.push(`code: ${code}`)
  if (errno != null) lines.push(`errno: ${errno}`)
  if (sqlState) lines.push(`sqlState: ${sqlState}`)

  if (code === 'ECONNREFUSED') {
    lines.push('原因: 本机没有程序在 MYSQL_HOST:MYSQL_PORT 上监听（MySQL 未启动、端口不是 3306、或 host 写错）。')
  } else if (code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
    lines.push('原因: 网络不可达或 DNS/主机名解析失败。')
  } else if (errno === 1045 || code === 'ER_ACCESS_DENIED_ERROR') {
    lines.push('原因: 用户名或密码被拒绝（账号不存在、密码错误、或 root 仅允许 socket 登录等）。')
  } else if (errno === 1049 || code === 'ER_BAD_DB_ERROR') {
    lines.push('原因: MYSQL_DATABASE 指定的库不存在，请先建库或清空 MYSQL_DATABASE 只测连接。')
  } else if (errno === 1044 || code === 'ER_DBACCESS_DENIED_ERROR') {
    lines.push('原因: 用户无权访问该数据库。')
  } else if (errno === 2003) {
    lines.push('原因: 无法连接到 MySQL 服务器（服务未开、bind-address 未监听 TCP 等）。')
  } else {
    lines.push('原因: 请根据 errno / code 查 MySQL 官方文档或服务器错误日志。')
  }

  return lines.join('\n')
}

async function main() {
  loadDotEnv()

  const host = process.env.MYSQL_HOST || '127.0.0.1'
  const port = Number(process.env.MYSQL_PORT || 3306)
  const user = process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQL_PASSWORD ?? ''
  const database = (process.env.MYSQL_DATABASE || '').trim()

  console.log('[db:test] 尝试连接 MySQL …')
  console.log(`  host=${host} port=${port} user=${user} database=${database || '(未指定)'}`)

  let conn
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      ...(database ? { database } : {}),
    })

    await conn.ping()
    console.log('[db:test] ✓ ping 成功')

    const [rows] = await conn.query('SELECT 1 AS ok, VERSION() AS version, DATABASE() AS current_db')
    console.log('[db:test] ✓ 查询成功:', rows)

    if (database) {
      const [tables] = await conn.query(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? LIMIT 5',
        [database],
      )
      console.log('[db:test] ✓ 当前库表（最多 5 条）:', tables)
    }

    console.log('\n[db:test] 全部通过。')
  } catch (err) {
    console.error('\n[db:test] ✗ 失败\n')
    console.error(explainMySqlError(err))
    process.exitCode = 1
  } finally {
    if (conn) await conn.end().catch(() => {})
  }
}

main()
