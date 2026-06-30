import { assertAiEnabled } from '../../../utils/ai/config'
import {
  getEmbeddingIndexStats,
  rebuildAllPostTextIndex,
  rebuildPostTextIndexByIds,
} from '../../../utils/ai/post-text-index'
import { fetchPostBySlug } from '../../../utils/post-mutate'
import { OllamaError } from '../../../utils/ai/ollama'

export default defineEventHandler(async (event) => {
  const ai = assertAiEnabled(event)

  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const body = await readBody<{
    all?: boolean
    slugs?: string[]
    post_ids?: number[]
  }>(event)

  const pool = useMysqlPool()
  const conn = await pool.getConnection()

  try {
    let postIds: number[] = []

    if (body.all === true) {
      const [rows] = await conn.query(
        'SELECT id FROM posts WHERE status = ? ORDER BY id ASC',
        ['published'],
      )
      postIds = (rows as { id: number }[]).map((r) => r.id)
    } else if (Array.isArray(body.post_ids) && body.post_ids.length) {
      const seen = new Set<number>()
      for (const raw of body.post_ids) {
        const id = Number(raw)
        if (!Number.isFinite(id) || id < 1 || seen.has(id)) continue
        seen.add(id)
        postIds.push(id)
      }
    } else {
      const slugs = Array.isArray(body.slugs) ? body.slugs : []
      if (!slugs.length) {
        throw createError({
          statusCode: 400,
          message: '请提供 slugs / post_ids 数组，或设置 all: true 重建全库文本索引',
        })
      }
      const seen = new Set<number>()
      for (const raw of slugs) {
        const slug = String(raw).trim()
        if (!slug) continue
        const post = await fetchPostBySlug(conn, slug)
        if (!post || seen.has(post.id)) continue
        seen.add(post.id)
        postIds.push(post.id)
      }
      if (!postIds.length) {
        throw createError({ statusCode: 404, message: '未找到可重建的文章' })
      }
    }

    const result =
      body.all === true
        ? await rebuildAllPostTextIndex(pool, ai)
        : await rebuildPostTextIndexByIds(pool, postIds, ai)
    const stats = await getEmbeddingIndexStats(pool)

    return {
      ok: true,
      ...result,
      stats,
    }
  } catch (e: unknown) {
    if (e instanceof OllamaError) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    const err = e as { statusCode?: number; message?: string }
    if (err.statusCode) throw e
    throw createError({
      statusCode: 500,
      message: err.message || '文本索引重建失败',
    })
  } finally {
    conn.release()
  }
})
