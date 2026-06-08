import { createError } from 'h3'
import type { Pool, PoolConnection } from 'mysql2/promise'

type DbExecutor = Pool | PoolConnection

/** 同一父级：parent_id 相等；NULL 与 NULL 视为同一父级（<=>） */
export async function findSiblingDirectoryByName(
  db: DbExecutor,
  parentId: number | null,
  name: string,
  excludeId?: number,
): Promise<{ id: number } | null> {
  const params: (number | string | null)[] = [parentId, name]
  let sql = 'SELECT id FROM directories WHERE parent_id <=> ? AND name = ?'
  if (excludeId != null) {
    sql += ' AND id <> ?'
    params.push(excludeId)
  }
  sql += ' LIMIT 1'
  const [rows] = await db.query(sql, params)
  const list = rows as { id: number }[]
  return list[0] ?? null
}

export async function findSiblingDirectoryBySlug(
  db: DbExecutor,
  parentId: number | null,
  slug: string,
  excludeId?: number,
): Promise<{ id: number } | null> {
  const params: (number | string | null)[] = [parentId, slug]
  let sql = 'SELECT id FROM directories WHERE parent_id <=> ? AND slug = ?'
  if (excludeId != null) {
    sql += ' AND id <> ?'
    params.push(excludeId)
  }
  sql += ' LIMIT 1'
  const [rows] = await db.query(sql, params)
  const list = rows as { id: number }[]
  return list[0] ?? null
}

export async function assertDirectorySiblingNameAvailable(
  db: DbExecutor,
  parentId: number | null,
  name: string,
  excludeId?: number,
): Promise<void> {
  const hit = await findSiblingDirectoryByName(db, parentId, name, excludeId)
  if (hit) {
    throw createError({
      statusCode: 409,
      message: '同一父级下目录名称已存在，请更换名称',
    })
  }
}

export async function assertDirectorySiblingSlugAvailable(
  db: DbExecutor,
  parentId: number | null,
  slug: string,
  excludeId?: number,
): Promise<void> {
  const hit = await findSiblingDirectoryBySlug(db, parentId, slug, excludeId)
  if (hit) {
    throw createError({
      statusCode: 409,
      message: '同一父级下 slug 已存在，请更换英文路径',
    })
  }
}
