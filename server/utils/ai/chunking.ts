import { stripMarkdown } from '../posts'

const CHUNK_SIZE = 700
const CHUNK_OVERLAP = 80

/** 将标题 + Markdown 正文切分为检索用文本块 */
export function chunkPostText(title: string, bodyMarkdown: string): string[] {
  const plain = stripMarkdown(bodyMarkdown)
  const prefix = title.trim() ? `${title.trim()}\n\n` : ''
  const full = `${prefix}${plain}`.trim()
  if (!full) return []

  if (full.length <= CHUNK_SIZE) return [full]

  const chunks: string[] = []
  let start = 0
  while (start < full.length) {
    const end = Math.min(start + CHUNK_SIZE, full.length)
    chunks.push(full.slice(start, end).trim())
    if (end >= full.length) break
    start = Math.max(0, end - CHUNK_OVERLAP)
  }
  return chunks.filter(Boolean)
}
