/** RAG 回答中模型误加的「暂无足够内容」类免责声明（检索命中后仍可能出现） */
const CONTRADICTORY_FALLBACK_LINE =
  /^\s*知识库中暂无(足够)?相关内容[^。\n]*[。]?\s*$/u

const CONTRADICTORY_FALLBACK_INLINE =
  /知识库中暂无(足够)?相关内容[^。\n]*[。]?/gu

/** 是否整段回答几乎只有「暂无相关内容」提示 */
export function isRagFallbackOnlyAnswer(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (!/知识库中暂无(足够)?相关内容/.test(t)) return false
  const withoutFallback = t.replace(CONTRADICTORY_FALLBACK_INLINE, '').trim()
  return withoutFallback.length < 8
}

/**
 * 去掉与实质回答矛盾的 fallback 句；若全文本就只是 fallback 则保留。
 */
export function sanitizeRagAssistantAnswer(
  text: string,
  options?: { hasRetrievedChunks?: boolean },
): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  if (isRagFallbackOnlyAnswer(trimmed)) return trimmed
  if (options?.hasRetrievedChunks === false) return trimmed

  let out = trimmed.replace(CONTRADICTORY_FALLBACK_INLINE, '').trim()

  const lines = out.split('\n')
  while (
    lines.length > 0 &&
    CONTRADICTORY_FALLBACK_LINE.test(lines[lines.length - 1] ?? '')
  ) {
    lines.pop()
  }
  out = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  return out.length >= 8 ? out : trimmed
}
