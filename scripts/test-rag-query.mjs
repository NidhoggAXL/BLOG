import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chitChatReply, isChitChatQuery } from '../server/utils/ai/rag-query.ts'

describe('isChitChatQuery', () => {
  it('detects greetings', () => {
    assert.ok(isChitChatQuery('你好'))
    assert.ok(isChitChatQuery('你好！'))
    assert.ok(isChitChatQuery('hello'))
    assert.ok(isChitChatQuery('谢谢'))
  })

  it('does not treat knowledge questions as chitchat', () => {
    assert.ok(!isChitChatQuery('Nuxt 怎么部署'))
    assert.ok(!isChitChatQuery('我写过哪些关于 Vue 的内容？'))
  })
})

describe('chitChatReply', () => {
  it('returns a non-empty hint', () => {
    assert.ok(chitChatReply().includes('知识库'))
  })
})
