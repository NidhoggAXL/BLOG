/** Obsidian 风格：将 #锚点 与标题文本匹配（精确 / 忽略大小写 / slug 化） */

export function slugifyHeadingAnchor(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '')
}

/** 按文档顺序生成唯一标题锚点 id（与 Markdown 渲染、大纲共用） */
export function createHeadingAnchorId(
  text: string,
  used: Map<string, number>,
): string {
  const base = slugifyHeadingAnchor(text) || 'section'
  const count = used.get(base) ?? 0
  used.set(base, count + 1)
  return count === 0 ? base : `${base}-${count}`
}

export function headingMatchesAnchor(headingText: string, anchor: string): boolean {
  const h = headingText.trim()
  let a = anchor.trim()
  if (!a || !h) return false
  if (a.startsWith('#')) a = a.slice(1).trim()
  if (h === a) return true
  if (h.toLowerCase() === a.toLowerCase()) return true
  if (slugifyHeadingAnchor(h) === slugifyHeadingAnchor(a)) return true
  return false
}

/** 按 #标题锚 截取章节；未匹配则返回全文 */
export function sliceMarkdownByHeadingAnchor(markdown: string, anchor: string | null | undefined): string {
  const raw = anchor?.trim()
  if (!raw) return markdown

  const lines = markdown.split(/\r?\n/)
  let inFence = false
  let fenceChar = ''
  let startIdx = -1
  let matchLevel = 6

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const fenceOpen = line.match(/^(`{3,}|~{3,})/)
    if (fenceOpen) {
      const ch = fenceOpen[1]![0]!
      if (!inFence) {
        inFence = true
        fenceChar = ch
      } else if (line.startsWith(fenceChar.repeat(3))) {
        inFence = false
      }
      continue
    }
    if (inFence) continue

    const hm = line.match(/^(#{1,6})\s+(.+?)(?:\s+#*)?\s*$/)
    if (!hm) continue

    const level = hm[1]!.length
    const text = hm[2]!.trim()

    if (startIdx < 0) {
      if (headingMatchesAnchor(text, raw)) {
        startIdx = i
        matchLevel = level
      }
    } else if (level <= matchLevel) {
      return lines.slice(startIdx, i).join('\n').trimEnd()
    }
  }

  if (startIdx >= 0) {
    return lines.slice(startIdx).join('\n').trimEnd()
  }
  return markdown
}
