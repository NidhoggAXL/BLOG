import type { Pool, PoolConnection } from 'mysql2/promise'
import type { AiRuntimeConfig } from './config'
import { getAiConfig } from './config'
import { chunkPostText } from './chunking'
import { ollamaEmbed } from './ollama'

let tableExistsCache: boolean | null = null

/** 同一 post_id 的索引任务串行，避免并发 DELETE/INSERT 死锁 */
const postSyncChains = new Map<number, Promise<unknown>>()

function isDeadlockError(e: unknown): boolean {
  const err = e as { errno?: number; code?: string }
  return err.errno === 1213 || err.code === 'ER_LOCK_DEADLOCK'
}

async function withDeadlockRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      if (!isDeadlockError(e) || attempt === maxAttempts) throw e
      await new Promise((r) => setTimeout(r, 50 * attempt))
    }
  }
  throw new Error('unreachable')
}

async function withPostSyncLock<T>(
  postId: number,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = postSyncChains.get(postId) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(fn)
  postSyncChains.set(postId, next)
  try {
    return await next
  } finally {
    if (postSyncChains.get(postId) === next) {
      postSyncChains.delete(postId)
    }
  }
}

export async function embeddingsTableExists(pool: Pool | PoolConnection): Promise<boolean> {
  if (tableExistsCache === true) return true
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'post_embeddings' LIMIT 1`,
  )
  const exists = Array.isArray(rows) && rows.length > 0
  if (exists) tableExistsCache = true
  return exists
}

export async function deletePostEmbeddings(
  pool: Pool | PoolConnection,
  postId: number,
): Promise<void> {
  if (!(await embeddingsTableExists(pool))) return
  await pool.query('DELETE FROM post_embeddings WHERE post_id = ?', [postId])
}

export type PostTextIndexResult = {
  posts_indexed: number
  chunks_written: number
  failed: number
}

type EmbeddedChunk = {
  chunk_index: number
  chunk_text: string
  embedding: number[]
}

async function embedChunks(ai: AiRuntimeConfig, chunks: string[]): Promise<EmbeddedChunk[]> {
  const result: EmbeddedChunk[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i]!
    const embedding = await ollamaEmbed(ai, chunkText)
    result.push({ chunk_index: i, chunk_text: chunkText, embedding })
  }
  return result
}

async function writePostEmbeddings(
  pool: Pool,
  postId: number,
  embedded: EmbeddedChunk[],
): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM post_embeddings WHERE post_id = ?', [postId])
    for (const row of embedded) {
      await conn.query(
        `INSERT INTO post_embeddings (post_id, chunk_index, chunk_text, embedding)
         VALUES (?, ?, ?, ?)`,
        [postId, row.chunk_index, row.chunk_text, JSON.stringify(row.embedding)],
      )
    }
    await conn.commit()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

/** 单篇：Markdown 去语法分块 → 向量化 → 写入 post_embeddings */
export async function syncPostTextIndex(
  pool: Pool,
  postId: number,
  ai: AiRuntimeConfig,
): Promise<{ chunks_written: number }> {
  return withPostSyncLock(postId, () => syncPostTextIndexInner(pool, postId, ai))
}

async function syncPostTextIndexInner(
  pool: Pool,
  postId: number,
  ai: AiRuntimeConfig,
): Promise<{ chunks_written: number }> {
  if (!ai.enabled) return { chunks_written: 0 }
  if (!(await embeddingsTableExists(pool))) return { chunks_written: 0 }

  const [rows] = await pool.query(
    'SELECT id, title, body, status FROM posts WHERE id = ? LIMIT 1',
    [postId],
  )
  const post = (rows as { id: number; title: string; body: string; status: string }[])[0]
  if (!post) return { chunks_written: 0 }

  if (post.status !== 'published') {
    await deletePostEmbeddings(pool, postId)
    return { chunks_written: 0 }
  }

  const chunks = chunkPostText(post.title, post.body)
  if (!chunks.length) {
    await deletePostEmbeddings(pool, postId)
    return { chunks_written: 0 }
  }

  // 向量化在事务外完成，缩短 post_embeddings 持锁时间
  const embedded = await embedChunks(ai, chunks)

  await withDeadlockRetry(() => writePostEmbeddings(pool, postId, embedded))

  return { chunks_written: embedded.length }
}

function assertEmbeddingsTable(pool: Pool | PoolConnection): Promise<void> {
  return embeddingsTableExists(pool).then((exists) => {
    if (!exists) {
      throw createError({
        statusCode: 503,
        message: 'post_embeddings 表不存在，请先执行 db/09-schema-post-embeddings.sql',
      })
    }
  })
}

/** 按 post id 列表重建文本索引（逐篇串行，每篇内部分块独立） */
export async function rebuildPostTextIndexByIds(
  pool: Pool,
  postIds: number[],
  ai: AiRuntimeConfig,
): Promise<PostTextIndexResult> {
  await assertEmbeddingsTable(pool)

  let posts_indexed = 0
  let chunks_written = 0
  let failed = 0

  for (const id of postIds) {
    try {
      const result = await syncPostTextIndex(pool, id, ai)
      posts_indexed += 1
      chunks_written += result.chunks_written
    } catch {
      failed += 1
    }
  }

  return { posts_indexed, chunks_written, failed }
}

/** 全库已发布文章重建文本索引 */
export async function rebuildAllPostTextIndex(
  pool: Pool,
  ai: AiRuntimeConfig,
): Promise<PostTextIndexResult> {
  await assertEmbeddingsTable(pool)

  const [rows] = await pool.query(
    'SELECT id FROM posts WHERE status = ? ORDER BY id ASC',
    ['published'],
  )
  const ids = (rows as { id: number }[]).map((r) => r.id)
  return rebuildPostTextIndexByIds(pool, ids, ai)
}

/** 异步索引，不阻塞文章保存响应 */
export function queuePostTextIndexSync(
  pool: Pool,
  postId: number,
  event?: Parameters<typeof useRuntimeConfig>[0],
): void {
  const ai = getAiConfig(event)
  if (!ai.enabled) return
  void syncPostTextIndex(pool, postId, ai).catch((e: unknown) => {
    const err = e as { message?: string }
    console.warn(`[ai] syncPostTextIndex(${postId}) failed:`, err.message ?? e)
  })
}

export async function getEmbeddingIndexStats(
  pool: Pool,
): Promise<{ chunk_count: number; post_count: number } | null> {
  if (!(await embeddingsTableExists(pool))) return null
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS chunk_count, COUNT(DISTINCT post_id) AS post_count
     FROM post_embeddings`,
  )
  const row = (rows as { chunk_count: number; post_count: number }[])[0]
  return row ?? { chunk_count: 0, post_count: 0 }
}

/** @deprecated 使用 syncPostTextIndex */
export const syncPostEmbeddings = syncPostTextIndex

/** @deprecated 使用 queuePostTextIndexSync */
export const queuePostEmbeddingsSync = queuePostTextIndexSync

/** @deprecated 使用 rebuildAllPostTextIndex */
export async function rebuildAllEmbeddings(
  pool: Pool,
  ai: AiRuntimeConfig,
): Promise<{ indexed: number; failed: number }> {
  const result = await rebuildAllPostTextIndex(pool, ai)
  return { indexed: result.posts_indexed, failed: result.failed }
}
