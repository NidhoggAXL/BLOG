import type { Pool, PoolConnection } from 'mysql2/promise'
import type { AiRuntimeConfig } from './config'
import { AiAbortedError } from './abort'
import { getAiConfig } from './config'
import { chunkPostText } from './chunking'
import { ollamaEmbed } from './ollama'
import { cosineSimilarity } from './similarity'

export type EmbeddingRow = {
  id: number
  post_id: number
  chunk_index: number
  chunk_text: string
  embedding: number[]
  slug: string
  title: string
}

type RawEmbeddingRow = {
  id: number
  post_id: number
  chunk_index: number
  chunk_text: string
  embedding: string | number[]
  slug: string
  title: string
}

let tableExistsCache: boolean | null = null

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

function parseEmbedding(raw: string | number[]): number[] {
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as number[]) : []
  } catch {
    return []
  }
}

export async function deletePostEmbeddings(
  pool: Pool | PoolConnection,
  postId: number,
): Promise<void> {
  if (!(await embeddingsTableExists(pool))) return
  await pool.query('DELETE FROM post_embeddings WHERE post_id = ?', [postId])
}

export async function syncPostEmbeddings(
  pool: Pool,
  postId: number,
  ai: AiRuntimeConfig,
): Promise<void> {
  if (!ai.enabled) return
  if (!(await embeddingsTableExists(pool))) return

  const [rows] = await pool.query(
    'SELECT id, title, body, status FROM posts WHERE id = ? LIMIT 1',
    [postId],
  )
  const post = (rows as { id: number; title: string; body: string; status: string }[])[0]
  if (!post) return

  if (post.status !== 'published') {
    await deletePostEmbeddings(pool, postId)
    return
  }

  const chunks = chunkPostText(post.title, post.body)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM post_embeddings WHERE post_id = ?', [postId])

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i]!
      const embedding = await ollamaEmbed(ai, chunkText)
      await conn.query(
        `INSERT INTO post_embeddings (post_id, chunk_index, chunk_text, embedding)
         VALUES (?, ?, ?, ?)`,
        [postId, i, chunkText, JSON.stringify(embedding)],
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

/** 异步索引，不阻塞文章保存响应 */
export function queuePostEmbeddingsSync(pool: Pool, postId: number, event?: Parameters<typeof useRuntimeConfig>[0]): void {
  const ai = getAiConfig(event)
  if (!ai.enabled) return
  void syncPostEmbeddings(pool, postId, ai).catch((e: unknown) => {
    const err = e as { message?: string }
    console.warn(`[ai] syncPostEmbeddings(${postId}) failed:`, err.message ?? e)
  })
}

async function loadPublishedEmbeddingRows(pool: Pool | PoolConnection): Promise<EmbeddingRow[]> {
  if (!(await embeddingsTableExists(pool))) return []
  const [rows] = await pool.query(
    `SELECT e.id, e.post_id, e.chunk_index, e.chunk_text, e.embedding,
            p.slug, p.title
     FROM post_embeddings e
     INNER JOIN posts p ON p.id = e.post_id AND p.status = 'published'
     ORDER BY e.post_id ASC, e.chunk_index ASC`,
  )
  return (rows as RawEmbeddingRow[]).map((r) => ({
    ...r,
    embedding: parseEmbedding(r.embedding),
  }))
}

export type RetrievedChunk = {
  post_id: number
  slug: string
  title: string
  chunk_text: string
  score: number
}

export async function searchSimilarChunks(
  pool: Pool,
  ai: AiRuntimeConfig,
  queryText: string,
  opts?: {
    topK?: number
    excludePostIds?: number[]
    signal?: AbortSignal
    minScore?: number
  },
): Promise<RetrievedChunk[]> {
  const topK = opts?.topK ?? ai.maxContextChunks
  const minScore = opts?.minScore ?? ai.minSimilarityScore
  const exclude = new Set(opts?.excludePostIds ?? [])

  if (opts?.signal?.aborted) {
    throw new AiAbortedError()
  }

  const queryVec = await ollamaEmbed(ai, queryText.trim(), opts?.signal)
  const rows = await loadPublishedEmbeddingRows(pool)

  const scored: RetrievedChunk[] = []
  for (const row of rows) {
    if (exclude.has(row.post_id)) continue
    if (row.embedding.length === 0) continue
    const score = cosineSimilarity(queryVec, row.embedding)
    scored.push({
      post_id: row.post_id,
      slug: row.slug,
      title: row.title,
      chunk_text: row.chunk_text,
      score,
    })
  }

  scored.sort((a, b) => b.score - a.score)
  const relevant = minScore > 0 ? scored.filter((item) => item.score >= minScore) : scored

  const byPost = new Map<number, RetrievedChunk>()
  for (const item of relevant) {
    const prev = byPost.get(item.post_id)
    if (!prev || item.score > prev.score) {
      byPost.set(item.post_id, item)
    }
  }

  return [...byPost.values()].sort((a, b) => b.score - a.score).slice(0, topK)
}

/** 双链推荐：按文章聚合 Top 候选（每篇取最高分块） */
export async function searchSimilarPosts(
  pool: Pool,
  ai: AiRuntimeConfig,
  queryText: string,
  opts?: { topK?: number; excludeSlugs?: string[] },
): Promise<RetrievedChunk[]> {
  const excludeSlugs = new Set((opts?.excludeSlugs ?? []).map((s) => s.toLowerCase()))
  const topK = opts?.topK ?? 20

  const queryVec = await ollamaEmbed(ai, queryText.trim())
  const rows = await loadPublishedEmbeddingRows(pool)

  const bestBySlug = new Map<string, RetrievedChunk>()
  for (const row of rows) {
    if (excludeSlugs.has(row.slug.toLowerCase())) continue
    if (row.embedding.length === 0) continue
    const score = cosineSimilarity(queryVec, row.embedding)
    const prev = bestBySlug.get(row.slug)
    if (!prev || score > prev.score) {
      bestBySlug.set(row.slug, {
        post_id: row.post_id,
        slug: row.slug,
        title: row.title,
        chunk_text: row.chunk_text,
        score,
      })
    }
  }

  return [...bestBySlug.values()].sort((a, b) => b.score - a.score).slice(0, topK)
}

export async function rebuildAllEmbeddings(
  pool: Pool,
  ai: AiRuntimeConfig,
): Promise<{ indexed: number; failed: number }> {
  if (!(await embeddingsTableExists(pool))) {
    throw createError({
      statusCode: 503,
      message: 'post_embeddings 表不存在，请先执行 db/09-schema-post-embeddings.sql',
    })
  }

  const [rows] = await pool.query(
    'SELECT id FROM posts WHERE status = ? ORDER BY id ASC',
    ['published'],
  )
  const ids = (rows as { id: number }[]).map((r) => r.id)
  let indexed = 0
  let failed = 0
  for (const id of ids) {
    try {
      await syncPostEmbeddings(pool, id, ai)
      indexed += 1
    } catch {
      failed += 1
    }
  }
  return { indexed, failed }
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
