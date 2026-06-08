import type { EditorView } from '@codemirror/view'
import type { ComposeMdToolDirective } from '~/constants/compose-md-tools'
import { createHeadingAnchorId } from '~/utils/markdownAnchorSlice'

function replaceRange(
  view: EditorView,
  from: number,
  to: number,
  insert: string,
  cursor: number,
) {
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: cursor },
  })
  view.focus()
}

function wrapSelection(view: EditorView, before: string, after: string, placeholder = 'text') {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to) || placeholder
  const insert = before + selected + after
  replaceRange(view, from, to, insert, from + before.length + selected.length)
}

function setLinePrefix(view: EditorView, prefix: string) {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const stripped = line.text.replace(/^(#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+|- \[[ xX]\]\s+)/, '')
  const offsetInContent = Math.max(0, pos - line.from - (line.text.length - stripped.length))
  const newLine = prefix + stripped
  const cursor = line.from + prefix.length + Math.min(offsetInContent, stripped.length)
  replaceRange(view, line.from, line.to, newLine, cursor)
}

function insertBlock(view: EditorView, block: string) {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const atLineEnd = pos >= line.to
  const prefix = atLineEnd && line.text.length > 0 ? '\n\n' : line.text.length === 0 ? '' : '\n'
  const insert = prefix + block
  const cursor = line.from + insert.length
  replaceRange(view, line.to, line.to, insert, cursor)
}

/** Obsidian：> [!type] + 带 > 的正文行（标题写在首行 [!type] 后可选） */
export function insertComposeCallout(view: EditorView, type: string) {
  insertBlock(view, `> [!${type}]\n> `)
}

export function runComposeMdCommand(view: EditorView, directive: ComposeMdToolDirective) {
  switch (directive) {
    case 'bold':
      wrapSelection(view, '**', '**', '粗体')
      break
    case 'italic':
      wrapSelection(view, '*', '*', '斜体')
      break
    case 'strikeThrough':
      wrapSelection(view, '~~', '~~', '删除线')
      break
    case 'h1':
      setLinePrefix(view, '# ')
      break
    case 'h2':
      setLinePrefix(view, '## ')
      break
    case 'h3':
      setLinePrefix(view, '### ')
      break
    case 'quote':
      setLinePrefix(view, '> ')
      break
    case 'unorderedList':
      setLinePrefix(view, '- ')
      break
    case 'orderedList':
      setLinePrefix(view, '1. ')
      break
    case 'task':
      setLinePrefix(view, '- [ ] ')
      break
    case 'codeRow':
      wrapSelection(view, '`', '`', 'code')
      break
    case 'code': {
      const { from, to } = view.state.selection.main
      const selected = view.state.sliceDoc(from, to)
      const block = selected ? `\`\`\`\n${selected}\n\`\`\`` : '```\n```'
      const cursor = selected ? from + 4 + selected.length : from + 3
      replaceRange(view, from, to, block, cursor)
      break
    }
    case 'link':
      wrapSelection(view, '[', '](url)', '链接文字')
      break
    case 'image':
      wrapSelection(view, '![', '](url)', 'alt')
      break
    case 'table':
      insertBlock(
        view,
        '| 列1 | 列2 |\n| --- | --- |\n|  |  |',
      )
      break
    case 'katexInline':
      wrapSelection(view, '$', '$', 'E=mc^2')
      break
    case 'katexBlock':
      insertBlock(view, '$$\nE=mc^2\n$$')
      break
    default:
      break
  }
}

export type CatalogHeading = {
  level: number
  text: string
  line: number
  anchor: string
}

export type CatalogTreeNode = {
  heading: CatalogHeading
  children: CatalogTreeNode[]
}

/** 将扁平标题列表转为层级树（用于大纲折叠） */
export function buildCatalogTree(headings: CatalogHeading[]): CatalogTreeNode[] {
  const root: CatalogTreeNode[] = []
  const stack: CatalogTreeNode[] = []
  for (const h of headings) {
    const node: CatalogTreeNode = { heading: h, children: [] }
    while (stack.length > 0 && stack[stack.length - 1]!.heading.level >= h.level) {
      stack.pop()
    }
    if (stack.length === 0) root.push(node)
    else stack[stack.length - 1]!.children.push(node)
    stack.push(node)
  }
  return root
}

export function parseMarkdownHeadings(doc: string): CatalogHeading[] {
  const headings: CatalogHeading[] = []
  const usedAnchors = new Map<string, number>()
  const lines = doc.split('\n')
  let inFence = false
  let fenceChar = ''

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

    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (m) {
      const text = m[2].replace(/\s+#+\s*$/, '').trim()
      headings.push({
        level: m[1].length,
        text,
        line: i + 1,
        anchor: createHeadingAnchorId(text, usedAnchors),
      })
    }
  }
  return headings
}
