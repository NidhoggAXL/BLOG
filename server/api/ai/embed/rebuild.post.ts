import { assertAiEnabled } from '../../../utils/ai/config'
import { rebuildAllEmbeddings, getEmbeddingIndexStats } from '../../../utils/ai/embeddings'
import { OllamaError } from '../../../utils/ai/ollama'

export default defineEventHandler(async (event) => {
  const ai = assertAiEnabled(event)

  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const pool = useMysqlPool()

  try {
    const result = await rebuildAllEmbeddings(pool, ai)
    const stats = await getEmbeddingIndexStats(pool)
    return {
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
      message: err.message || '索引重建失败',
    })
  }
})
