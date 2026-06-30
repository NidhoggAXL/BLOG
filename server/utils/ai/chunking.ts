import { stripMarkdown } from '../posts'

const CHUNK_SIZE = 700
const CHUNK_OVERLAP = 80
/** 在窗口内找切分点时，至少保留这么长的有效内容 */
const MIN_SPLIT_POS = 120

const SPLIT_MARKERS = ['\n\n', '\n', '。', '！', '？', '；', '. ', '! ', '? ', '，', ', ']

function findSplitEnd(full: string, start: number, maxEnd: number): number {
  if (maxEnd >= full.length) return full.length

  const window = full.slice(start, maxEnd)
  let best = -1

  for (const marker of SPLIT_MARKERS) {
    const idx = window.lastIndexOf(marker)
    if (idx >= MIN_SPLIT_POS) {
      best = Math.max(best, idx + marker.length)
    }
  }

  return best > 0 ? start + best : maxEnd
}

/** 将标题 + Markdown 正文切分为检索用文本块（按语义边界切分，块间保留重叠） */
export function chunkPostText(title: string, bodyMarkdown: string): string[] {
  const plain = stripMarkdown(bodyMarkdown)
  const prefix = title.trim() ? `${title.trim()}\n\n` : ''
  const full = `${prefix}${plain}`.trim()
  if (!full) return []

  if (full.length <= CHUNK_SIZE) return [full]

  const chunks: string[] = []
  let start = 0

  while (start < full.length) {
    const maxEnd = Math.min(start + CHUNK_SIZE, full.length)
    const end = findSplitEnd(full, start, maxEnd)
    const raw = full.slice(start, end)

    // 仅首块去开头空白、末块去结尾空白，避免中间块 trim 破坏重叠覆盖
    const chunk =
      chunks.length === 0
        ? raw.trimStart()
        : end >= full.length
          ? raw.trimEnd()
          : raw

    if (chunk) chunks.push(chunk)

    if (end >= full.length) break

    const nextStart = end - CHUNK_OVERLAP
    if (nextStart <= start) {
      start = end
    } else {
      start = nextStart
    }
  }

  return chunks
}
