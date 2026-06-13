/** 寒暄/闲聊：无需检索知识库 */
export function isChitChatQuery(question: string): boolean {
  const t = question.trim()
  if (!t || t.length > 20) return false
  return /^(你好|您好|嗨|哈喽|在吗|hello|hi|hey|谢谢|感谢|多谢|再见|拜拜|bye|goodbye|ok|okay|好的|嗯+|啊+|哦+|噢+)[\s!！?？。~～啊呀哦呢嘛哈]*$/iu.test(
    t,
  )
}

export function chitChatReply(): string {
  return '你好！我是博客知识库助手，可以问我关于已发布笔记的内容，例如某篇的要点或相关主题。'
}
