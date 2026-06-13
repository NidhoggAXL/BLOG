import type { ResultSetHeader } from 'mysql2'
import { directoryDuplicateEntryMessage } from '../../utils/directory-db-errors'
import {
  assertDirectorySiblingNameAvailable,
  assertDirectorySiblingSlugAvailable,
} from '../../utils/directory-sibling-uniqueness'
import { directoryNameAndSlug } from '../../../utils/directorySlug'
import { normalizeManualSortOrder } from '../../../utils/sortOrder'
import { getDescendantIdsIncludingSelf } from '../../utils/directory-ancestors'
import type { DirectoryRow } from '../../../types/directory'

function normalizeParentId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  if (n === 0) return null
  return n
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id < 1) {
    throw createError({ statusCode: 400, message: '无效的目录 id' })
  }

  const body = await readBody<{
    name?: string
    parent_id?: number | null
    sort_order?: number
  }>(event)

  const pool = useMysqlPool()

  const [curRows] = await pool.query(
    'SELECT id, parent_id, name, slug, sort_order FROM directories WHERE id = ? LIMIT 1',
    [id],
  )
  const cur = (curRows as DirectoryRow[])[0]
  if (!cur) {
    throw createError({ statusCode: 404, message: '目录不存在' })
  }

  const rawName = body.name !== undefined ? String(body.name).trim() : cur.name
  if (!rawName) {
    throw createError({ statusCode: 400, message: '目录名称不能为空' })
  }

  const { name, slug } = directoryNameAndSlug(rawName)

  const sortOrder =
    body.sort_order !== undefined
      ? normalizeManualSortOrder(body.sort_order)
      : cur.sort_order

  const nextParent = 'parent_id' in body ? normalizeParentId(body.parent_id) : cur.parent_id

  if (nextParent === id) {
    throw createError({ statusCode: 400, message: '不能将父级设为自己' })
  }
  if (nextParent !== null) {
    const forbidden = await getDescendantIdsIncludingSelf(pool, id)
    if (forbidden.has(nextParent)) {
      throw createError({ statusCode: 400, message: '不能将父级设为自己的子目录' })
    }
    const [pRows] = await pool.query('SELECT id FROM directories WHERE id = ? LIMIT 1', [nextParent])
    if (!(pRows as { id: number }[])[0]) {
      throw createError({ statusCode: 400, message: '父目录不存在' })
    }
  }

  await assertDirectorySiblingNameAvailable(pool, nextParent, name, id)
  await assertDirectorySiblingSlugAvailable(pool, nextParent, slug, id)

  try {
    const [res] = await pool.query<ResultSetHeader>(
      'UPDATE directories SET name = ?, slug = ?, sort_order = ?, parent_id = ? WHERE id = ?',
      [name, slug, sortOrder, nextParent, id],
    )
    if (res.affectedRows === 0) {
      throw createError({ statusCode: 404, message: '目录未更新' })
    }
    return { ok: true, id, name, slug, sort_order: sortOrder, parent_id: nextParent }
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; sqlMessage?: string; statusCode?: number }
    if (err.statusCode) throw e
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      throw createError({
        statusCode: 409,
        message: directoryDuplicateEntryMessage(err.sqlMessage),
        data: err.sqlMessage,
      })
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
      throw createError({ statusCode: 400, message: '父目录不存在' })
    }
    throw createError({
      statusCode: 500,
      message: err.sqlMessage || '更新失败',
    })
  }
})
