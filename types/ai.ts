export type ChatMessageItem = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { slug: string; title: string }[]
  streaming?: boolean
  error?: boolean
}
