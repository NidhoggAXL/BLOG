/** 从上传的 Markdown 推断标题（YAML title > 首个 # 标题 > 文件名去后缀） */
export function inferPostTitleFromMarkdown(markdown: string, fileStem: string): string {
  const text = markdown.replace(/^\uFEFF/, '')
  const trimmed = text.trim()

  if (trimmed.startsWith('---')) {
    const end = trimmed.indexOf('\n---', 3)
    if (end !== -1) {
      const fm = trimmed.slice(3, end)
      for (const line of fm.split('\n')) {
        const m = line.match(/^title:\s*(.+)\s*$/i)
        if (m?.[1]) {
          const v = m[1].trim().replace(/^["']|["']$/g, '')
          if (v) return v.slice(0, 255)
        }
      }
    }
  }

  const hm = trimmed.match(/^#\s+(.+)$/m)
  if (hm?.[1]) return hm[1].trim().slice(0, 255)

  const stem = fileStem.replace(/\.(md|markdown)$/i, '').trim()
  return (stem || '未命名').slice(0, 255)
}

/** 去掉扩展名，供 slug 提示 */
export function fileStemFromName(fileName: string): string {
  return fileName.replace(/\.(md|markdown)$/i, '').trim()
}
