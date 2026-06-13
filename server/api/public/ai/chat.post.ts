import { assertAiEnabled } from '../../../utils/ai/config'
import { createClientAbortSignal, isAiAbortedError } from '../../../utils/ai/abort'
import { OllamaError } from '../../../utils/ai/ollama'
import { checkPublicAiRateLimit, getClientIp } from '../../../utils/ai/rate-limit'
import { createRagEventStream, streamRagAnswer } from '../../../utils/ai/rag'

export default defineEventHandler(async (event) => {
  const ai = assertAiEnabled(event)

  const ip = getClientIp(event)
  if (!checkPublicAiRateLimit(ip, ai.publicRateLimitPerMin)) {
    throw createError({ statusCode: 429, message: '请求过于频繁，请稍后再试' })
  }

  const body = await readBody<{ message?: string }>(event)
  const message = String(body?.message ?? '').trim()
  if (!message) {
    throw createError({ statusCode: 400, message: '请输入问题' })
  }
  if (message.length > 2000) {
    throw createError({ statusCode: 400, message: '问题过长（最多 2000 字）' })
  }

  const config = useRuntimeConfig(event)
  if (!config.mysqlDatabase) {
    throw createError({ statusCode: 503, message: '请在 .env 中配置 MYSQL_DATABASE' })
  }

  const pool = useMysqlPool()
  const stream = createRagEventStream(event)
  const clientSignal = createClientAbortSignal(event)

  void (async () => {
    try {
      for await (const part of streamRagAnswer(pool, ai, message, clientSignal)) {
        if (clientSignal.aborted) break

        if (part.type === 'sources') {
          await stream.push({
            event: 'sources',
            data: JSON.stringify({ sources: part.sources }),
          })
        } else if (part.type === 'chunk') {
          await stream.push({
            event: 'chunk',
            data: JSON.stringify({ content: part.content }),
          })
        } else if (part.type === 'empty') {
          await stream.push({
            event: 'error',
            data: JSON.stringify({ message: '请输入有效问题' }),
          })
        }
      }

      if (!clientSignal.aborted) {
        await stream.push({ event: 'done', data: '{}' })
      }
    } catch (e: unknown) {
      if (isAiAbortedError(e) || clientSignal.aborted) return

      const err = e as OllamaError | { message?: string; statusCode?: number }
      const statusCode = 'statusCode' in err && err.statusCode ? err.statusCode : 503
      const msg =
        statusCode === 503
          ? 'AI 服务不可用，请确认 Ollama 已启动且模型已下载'
          : err.message || '问答失败'
      await stream.push({
        event: 'error',
        data: JSON.stringify({ message: msg }),
      })
    } finally {
      await stream.close()
    }
  })()

  return stream.send()
})
