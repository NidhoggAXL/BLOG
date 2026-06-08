import type { AiRuntimeConfig } from './config'
import { searchSimilarPosts } from './embeddings'
import { ollamaChatComplete, type ChatMessage } from './ollama'

export type WikilinkSuggestion = {
  slug: string
  title: string
  reason: string
  score?: number
}

const BODY_PROMPT_MAX = 3000

const GENERIC_REASONS = new Set([
  '语义相关',
  '内容相似',
  '内容相关',
  '主题相关',
  '相关',
  '推荐阅读',
  '库内推荐',
  '相似',
])

function buildEmbeddingFallbackReason(
  currentTitle: string,
  candidateTitle: string,
  score?: number,
): string {
  const current = currentTitle.trim() || '当前文章'
  const target = candidateTitle.trim() || '该文章'
  const scoreHint =
    score != null && Number.isFinite(score) && score > 0
      ? `（知识库内容相似度约 ${Math.round(Math.min(score, 1) * 100)}%）`
      : ''
  return `《${target}》与《${current}》主题相近，适合作为延伸阅读或对照阅读${scoreHint}`
}

function buildRecentFallbackReason(candidateTitle: string): string {
  const target = candidateTitle.trim() || '该文章'
  return `《${target}》是知识库中近期发布的文章，可先作背景补充阅读`
}

function normalizeReason(reason: string, fallback: string): string {
  const trimmed = reason.trim()
  if (!trimmed || GENERIC_REASONS.has(trimmed) || trimmed.length < 10) {
    return fallback
  }
  return trimmed
}

function buildWikilinkSuggestSystemPrompt(max: number): string {
  return (
    '你是博客双链推荐助手。从候选列表中选出与「当前文章」最值得互链的文章，最多 ' +
    max +
    ' 条。\n\n' +
    '输出要求：\n' +
    '- 只输出 JSON 数组：[{"slug":"候选slug","reason":"推荐理由"}]\n' +
    '- slug 必须严格来自候选，禁止编造\n' +
    '- reason 用中文写 1～2 句，告诉作者：读者在读当前文章时，为什么值得点开这篇候选\n' +
    '- 要写出具体关联点，例如：同一技术栈、概念前后衔接、可对比阅读、同一系列笔记、补充案例等\n' +
    '- 禁止写「语义相关」「内容相似」「推荐」等空泛词\n\n' +
    '好的 reason 示例：\n' +
    '- "本文介绍 JavaScript 基础，该文介绍 C 语言，可对比两种语言的类型与内存模型"\n' +
    '- "两文都涉及前端框架入门，读完本文后可继续看组件化与状态管理的细节"\n\n' +
    '坏的 reason 示例：\n' +
    '- "语义相关"\n' +
    '- "内容相关"'
  )
}

function fallbackFromCandidates(
  candidates: { slug: string; title: string; score: number }[],
  max: number,
  currentTitle: string,
): WikilinkSuggestion[] {
  return candidates.slice(0, max).map((c) => ({
    slug: c.slug,
    title: c.title,
    reason: buildEmbeddingFallbackReason(currentTitle, c.title, c.score),
    score: c.score,
  }))
}

function parseSuggestionsJson(
  raw: string,
  allowedSlugs: Set<string>,
): WikilinkSuggestion[] | null {
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return null
  try {
    const arr = JSON.parse(match[0]) as unknown
    if (!Array.isArray(arr)) return null
    const out: WikilinkSuggestion[] = []
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue
      const row = item as { slug?: string; reason?: string }
      const slug = String(row.slug ?? '').trim()
      if (!slug || !allowedSlugs.has(slug.toLowerCase())) continue
      out.push({
        slug,
        title: '',
        reason: String(row.reason ?? '').trim(),
      })
    }
    return out.length ? out : null
  } catch {
    return null
  }
}

async function fetchRecentPublishedFallback(
  pool: ReturnType<typeof useMysqlPool>,
  excludeSlugs: string[],
  max: number,
): Promise<WikilinkSuggestion[]> {
  const exclude = new Set(excludeSlugs.map((s) => s.toLowerCase()))
  const [rows] = await pool.query(
    `SELECT slug, title FROM posts
     WHERE status = 'published'
     ORDER BY COALESCE(published_at, updated_at, created_at) DESC
     LIMIT 50`,
  )
  const out: WikilinkSuggestion[] = []
  for (const row of rows as { slug: string; title: string }[]) {
    if (exclude.has(row.slug.toLowerCase())) continue
    out.push({
      slug: row.slug,
      title: row.title,
      reason: buildRecentFallbackReason(row.title),
    })
    if (out.length >= max) break
  }
  return out
}

export async function suggestWikilinks(
  pool: ReturnType<typeof useMysqlPool>,
  ai: AiRuntimeConfig,
  input: {
    title: string
    body: string
    exclude_slugs: string[]
    existing_slugs: string[]
    max_suggestions?: number
  },
): Promise<{ suggestions: WikilinkSuggestion[] }> {
  const max = input.max_suggestions ?? ai.wikilinkMaxSuggestions
  const excludeSlugs = [
    ...input.exclude_slugs,
    ...input.existing_slugs,
  ]

  const bodySlice = input.body.slice(0, BODY_PROMPT_MAX)
  const queryText = `${input.title}\n\n${bodySlice}`.trim()

  let candidates: { slug: string; title: string; score: number }[] = []

  try {
    const retrieved = await searchSimilarPosts(pool, ai, queryText, {
      topK: 20,
      excludeSlugs,
    })
    candidates = retrieved.map((r) => ({
      slug: r.slug,
      title: r.title,
      score: r.score,
    }))
  } catch {
    candidates = []
  }

  if (candidates.length === 0) {
    const fallback = await fetchRecentPublishedFallback(pool, excludeSlugs, max)
    return { suggestions: fallback }
  }

  const allowedSlugs = new Set(candidates.map((c) => c.slug.toLowerCase()))
  const slugToTitle = new Map(candidates.map((c) => [c.slug.toLowerCase(), c.title]))
  const slugToScore = new Map(candidates.map((c) => [c.slug.toLowerCase(), c.score]))

  const candidateList = candidates
    .map((c, i) => `${i + 1}. slug=${c.slug} | 标题=${c.title}`)
    .join('\n')

  const currentTitle = input.title.trim() || '（未命名）'

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildWikilinkSuggestSystemPrompt(max),
    },
    {
      role: 'user',
      content:
        `当前文章标题：${currentTitle}\n` +
        `当前文章正文节选：\n${bodySlice.slice(0, 800)}\n\n` +
        `候选文章（只能从中选择 slug）：\n${candidateList}`,
    },
  ]

  let parsed: WikilinkSuggestion[] | null = null
  try {
    const raw = await ollamaChatComplete(ai, messages)
    parsed = parseSuggestionsJson(raw, allowedSlugs)
    if (!parsed) {
      const retry = await ollamaChatComplete(ai, [
        messages[0]!,
        {
          role: 'user',
          content: `${messages[1]!.content}\n\n只输出 JSON 数组，不要其他文字。`,
        },
      ])
      parsed = parseSuggestionsJson(retry, allowedSlugs)
    }
  } catch {
    parsed = null
  }

  if (!parsed || parsed.length === 0) {
    return { suggestions: fallbackFromCandidates(candidates, max, currentTitle) }
  }

  const suggestions = parsed.slice(0, max).map((s) => {
    const title = slugToTitle.get(s.slug.toLowerCase()) ?? s.slug
    const score = slugToScore.get(s.slug.toLowerCase())
    const fallbackReason = buildEmbeddingFallbackReason(currentTitle, title, score)
    return {
      slug: s.slug,
      title,
      reason: normalizeReason(s.reason, fallbackReason),
      score,
    }
  })

  return { suggestions }
}
