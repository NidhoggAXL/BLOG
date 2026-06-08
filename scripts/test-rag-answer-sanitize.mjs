import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isRagFallbackOnlyAnswer,
  sanitizeRagAssistantAnswer,
} from '../utils/ragAnswerSanitize.ts'

describe('sanitizeRagAssistantAnswer', () => {
  it('strips contradictory fallback after substantive answer', () => {
    const input =
      'JavaScript 是一种脚本语言。\n\n知识库中暂无足够相关内容来回答您的问题。'
    const out = sanitizeRagAssistantAnswer(input, { hasRetrievedChunks: true })
    assert.ok(out.includes('JavaScript'))
    assert.ok(!out.includes('暂无足够相关内容'))
  })

  it('keeps fallback-only answer', () => {
    const input = '知识库中暂无足够相关内容。'
    const out = sanitizeRagAssistantAnswer(input, { hasRetrievedChunks: true })
    assert.equal(out, input)
    assert.ok(isRagFallbackOnlyAnswer(input))
  })
})
