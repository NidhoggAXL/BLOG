import { assertAiEnabled } from '../../utils/ai/config'
import { OllamaError } from '../../utils/ai/ollama'
import { suggestWikilinks } from '../../utils/ai/wikilink-suggest'

export default defineEventHandler(async (event) => {
  const ai = assertAiEnabled(event)

  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const body = await readBody<{
    title?: string
    body?: string
    exclude_slugs?: string[]
    existing_slugs?: string[]
    max_suggestions?: number
  }>(event)

  const title = String(body?.title ?? '').trim()
  const markdownBody = typeof body?.body === 'string' ? body.body : ''
  const exclude_slugs = Array.isArray(body?.exclude_slugs)
    ? body.exclude_slugs.map((s) => String(s).trim()).filter(Boolean)
    : []
  const existing_slugs = Array.isArray(body?.existing_slugs)
    ? body.existing_slugs.map((s) => String(s).trim()).filter(Boolean)
    : []

  const pool = useMysqlPool()

  try {
    return await suggestWikilinks(pool, ai, {
      title,
      body: markdownBody,
      exclude_slugs,
      existing_slugs,
      max_suggestions: body?.max_suggestions,
    })
  } catch (e: unknown) {
    if (e instanceof OllamaError) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    const err = e as { statusCode?: number; message?: string }
    if (err.statusCode) throw e
    throw createError({
      statusCode: 503,
      message: err.message || '双链推荐失败，请确认 Ollama 与 embedding 模型已就绪',
    })
  }
})
