import type { ResultSetHeader } from 'mysql2'
import { directoryDuplicateEntryMessage } from '../../utils/directory-db-errors'
import {
  assertDirectorySiblingNameAvailable,
  assertDirectorySiblingSlugAvailable,
} from '../../utils/directory-sibling-uniqueness'
import { directoryNameAndSlug } from '../../../utils/directorySlug'
import { obsidianOrderFromSegment } from '../../../utils/obsidianDisplayPrefix'
import { normalizeManualSortOrder } from '../../../utils/sortOrder'

function resolveDirectorySortOrder(
  raw: unknown | undefined,
  name: string,
  fallback?: number | null,
): number | null {
  if (raw !== undefined) {
    const manual = normalizeManualSortOrder(raw)
    if (raw != null && manual != null) return manual
    return obsidianOrderFromSegment(name)
  }
  if (fallback !== undefined) return fallback
  return obsidianOrderFromSegment(name)
}

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
    throw createError({
      statusCode: 503,
      message: '请在 .env 中配置 MYSQL_DATABASE',
    })
  }

  const body = await readBody<{
    name?: string
    parent_id?: number | null
    sort_order?: number
  }>(event)

  const rawName = (body.name ?? '').trim()
  if (!rawName) {
    throw createError({ statusCode: 400, message: '目录名称不能为空' })
  }

  const parentId = normalizeParentId(body.parent_id)

  const { name, slug } = directoryNameAndSlug(rawName)
  const sortOrder = resolveDirectorySortOrder(body.sort_order, name)

  const pool = useMysqlPool()

  await assertDirectorySiblingNameAvailable(pool, parentId, name)
  await assertDirectorySiblingSlugAvailable(pool, parentId, slug)

  try {
    const [res] = await pool.query<ResultSetHeader>(
      'INSERT INTO directories (parent_id, name, slug, sort_order) VALUES (?, ?, ?, ?)',
      [parentId, name, slug, sortOrder],
    )
    return { id: res.insertId, parent_id: parentId, name, slug, sort_order: sortOrder }
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; sqlMessage?: string }
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
      message: err.sqlMessage || '数据库写入失败',
    })
  }
})
