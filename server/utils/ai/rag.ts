import type { H3Event } from 'h3'
import type { AiRuntimeConfig } from './config'
import { searchSimilarChunks, type RetrievedChunk } from './embeddings'
import { ollamaChatStream, type ChatMessage } from './ollama'

export type RagSource = { slug: string; title: string }

function buildRagMessages(question: string, chunks: RetrievedChunk[]): ChatMessage[] {
  if (chunks.length === 0) {
    return [
      {
        role: 'system',
        content: '你是博客知识库助手。当前没有检索到相关笔记，请明确告诉用户「知识库中暂无相关内容」。',
      },
      { role: 'user', content: question },
    ]
  }

  const context = chunks
    .map(
      (c, i) =>
        `[${i + 1}] 标题：${c.title}\n路径 slug：${c.slug}\n片段：${c.chunk_text}`,
    )
    .join('\n\n')

  return [
    {
      role: 'system',
      content:
        '你是博客作者的知识库助手。仅根据用户消息中的「检索片段」回答，不要编造。\n' +
        '规则：\n' +
        '1. 若能从检索片段归纳出与用户问题相关的信息，直接作答；禁止在已给出实质回答后再写「知识库中暂无足够相关内容」或类似否认检索结果的句子。\n' +
        '2. 仅当检索片段与用户问题完全无关、无法作答时，只回复一句：「知识库中暂无足够相关内容。」且不要输出其他正文。\n' +
        '3. 不要在回答末尾写「来源：」或链接列表（界面会单独展示引用文章）。',
    },
    {
      role: 'user',
      content: `检索片段：\n${context}\n\n用户问题：${question}`,
    },
  ]
}

export async function retrieveRagContext(
  pool: ReturnType<typeof useMysqlPool>,
  ai: AiRuntimeConfig,
  question: string,
): Promise<{ chunks: RetrievedChunk[]; sources: RagSource[] }> {
  const chunks = await searchSimilarChunks(pool, ai, question, {
    topK: ai.maxContextChunks,
  })
  const seen = new Set<string>()
  const sources: RagSource[] = []
  for (const c of chunks) {
    if (seen.has(c.slug)) continue
    seen.add(c.slug)
    sources.push({ slug: c.slug, title: c.title })
  }
  return { chunks, sources }
}

export async function* streamRagAnswer(
  pool: ReturnType<typeof useMysqlPool>,
  ai: AiRuntimeConfig,
  question: string,
): AsyncGenerator<
  | { type: 'sources'; sources: RagSource[] }
  | { type: 'chunk'; content: string }
  | { type: 'empty' }
> {
  const trimmed = question.trim()
  if (!trimmed) {
    yield { type: 'empty' }
    return
  }

  let chunks: RetrievedChunk[] = []
  let sources: RagSource[] = []
  try {
    const retrieved = await retrieveRagContext(pool, ai, trimmed)
    chunks = retrieved.chunks
    sources = retrieved.sources
  } catch {
    yield { type: 'chunk', content: '知识库检索失败，请确认 Ollama 与 embedding 模型已就绪。' }
    return
  }

  yield { type: 'sources', sources }

  if (chunks.length === 0) {
    yield {
      type: 'chunk',
      content: '知识库中暂无相关内容。请尝试换种问法，或确认已有已发布文章并完成索引重建。',
    }
    return
  }

  const messages = buildRagMessages(trimmed, chunks)
  try {
    for await (const text of ollamaChatStream(ai, messages)) {
      if (text) {
        yield { type: 'chunk', content: text }
      }
    }
  } catch (e: unknown) {
    const err = e as { message?: string }
    yield {
      type: 'chunk',
      content: err.message || 'AI 回答生成失败，请稍后重试。',
    }
  }
}

export function createRagEventStream(event: H3Event) {
  return createEventStream(event)
}
