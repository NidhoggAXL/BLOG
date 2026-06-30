import type { Pool, PoolConnection } from 'mysql2/promise'
import type { AiRuntimeConfig } from './config'
import { AiAbortedError } from './abort'
import { ollamaEmbed } from './ollama'
import { cosineSimilarity } from './similarity'
import { embeddingsTableExists } from './post-text-index'

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

function parseEmbedding(raw: string | number[]): number[] {
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as number[]) : []
  } catch {
    return []
  }
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
