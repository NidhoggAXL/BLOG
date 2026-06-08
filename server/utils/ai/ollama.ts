import type { AiRuntimeConfig } from './config'

export class OllamaError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 503) {
    super(message)
    this.name = 'OllamaError'
    this.statusCode = statusCode
  }
}

async function ollamaFetch(
  ai: AiRuntimeConfig,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ai.requestTimeoutMs)
  try {
    const res = await fetch(`${ai.ollamaBaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new OllamaError(
        text || `Ollama 请求失败 (${res.status})`,
        res.status === 404 ? 503 : res.status,
      )
    }
    return res
  } catch (e: unknown) {
    if (e instanceof OllamaError) throw e
    const err = e as { name?: string }
    if (err.name === 'AbortError') {
      throw new OllamaError('Ollama 请求超时', 504)
    }
    throw new OllamaError('无法连接本地 Ollama，请确认服务已启动', 503)
  } finally {
    clearTimeout(timer)
  }
}

export async function ollamaHealthCheck(ai: AiRuntimeConfig): Promise<boolean> {
  try {
    const res = await ollamaFetch(ai, '/api/tags', { method: 'GET' })
    await res.json()
    return true
  } catch {
    return false
  }
}

export async function ollamaEmbed(ai: AiRuntimeConfig, text: string): Promise<number[]> {
  const res = await ollamaFetch(ai, '/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ai.embedModel,
      prompt: text,
    }),
  })
  const data = (await res.json()) as { embedding?: number[] }
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new OllamaError('Embedding 模型返回无效向量', 503)
  }
  return data.embedding
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function ollamaChatComplete(
  ai: AiRuntimeConfig,
  messages: ChatMessage[],
): Promise<string> {
  const res = await ollamaFetch(ai, '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ai.chatModel,
      messages,
      stream: false,
      think: false,
    }),
  })
  const data = (await res.json()) as { message?: { content?: string } }
  return (data.message?.content ?? '').trim()
}

export async function* ollamaChatStream(
  ai: AiRuntimeConfig,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const res = await ollamaFetch(ai, '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ai.chatModel,
      messages,
      stream: true,
      think: false,
    }),
  })

  const reader = res.body?.getReader()
  if (!reader) throw new OllamaError('Ollama 流式响应不可用', 503)

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const json = JSON.parse(trimmed) as {
          message?: { content?: string }
          done?: boolean
        }
        const chunk = json.message?.content
        if (chunk) yield chunk
      } catch {
        /* ignore partial json */
      }
    }
  }
}
