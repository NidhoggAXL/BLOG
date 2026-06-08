import { maskMarkdownForWikilinkScan } from '~/utils/wikilinkShared'

export const CALLOUT_TYPES = [
  'tip',
  'note',
  'info',
  'warning',
  'warn',
  'danger',
  'error',
  'bug',
  'example',
  'quote',
  'question',
  'success',
  'failure',
  'abstract',
  'todo',
  'hint',
  'important',
  'caution',
] as const

export type CalloutType = (typeof CALLOUT_TYPES)[number]

/** Obsidian 预设 Callout 图标（写入 HTML，避免 CSS mask 覆盖） */
export const CALLOUT_EMOJI: Record<string, string> = {
  note: '📝',
  tip: '💡',
  hint: '💡',
  important: '⭐',
  warning: '⚠️',
  warn: '⚠️',
  caution: '🚨',
  info: 'ℹ️',
  question: '❓',
  example: '📋',
  quote: '💬',
  abstract: '📌',
  todo: '☑️',
  success: '✅',
  failure: '❌',
  danger: '⛔',
  error: '⛔',
  bug: '🐛',
}

export function calloutEmojiForType(type: string): string {
  const norm = normalizeCalloutType(type)
  return CALLOUT_EMOJI[norm] ?? CALLOUT_EMOJI[type.toLowerCase()] ?? '📄'
}

const CALLOUT_LABELS: Record<string, string> = {
  tip: '提示',
  note: '笔记',
  info: '信息',
  warning: '警告',
  warn: '警告',
  danger: '危险',
  error: '错误',
  bug: '缺陷',
  example: '示例',
  quote: '引用',
  question: '问题',
  success: '成功',
  failure: '失败',
  abstract: '摘要',
  todo: '待办',
  hint: '提示',
  important: '重要',
  caution: '注意',
}

function normalizeCalloutType(raw: string): string {
  const t = raw.toLowerCase()
  if (t === 'warn') return 'warning'
  return t
}

export function calloutLabelForType(type: string): string {
  const norm = normalizeCalloutType(type)
  return CALLOUT_LABELS[norm] ?? CALLOUT_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1)
}

function defaultCalloutTitle(type: string): string {
  return calloutLabelForType(type)
}

export type CalloutPickerItem = {
  type: CalloutType
  label: string
  emoji: string
}

/** 编辑页工具栏：全部可选 Callout 类型 */
export function getCalloutPickerItems(): CalloutPickerItem[] {
  return CALLOUT_TYPES.map((type) => ({
    type,
    label: calloutLabelForType(type),
    emoji: calloutEmojiForType(type),
  }))
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type CalloutRenderOptions = {
  collapsible?: boolean
  defaultOpen?: boolean
}

export function buildCalloutHtml(
  type: string,
  title: string,
  innerHtml: string,
  opts?: CalloutRenderOptions,
): string {
  const norm = normalizeCalloutType(type)
  const emoji = calloutEmojiForType(type)
  const collapsible = opts?.collapsible ?? false
  const openAttr = opts?.defaultOpen !== false ? ' open' : ''

  if (collapsible) {
    return (
      `<div class="md-callout md-callout--${escapeHtml(norm)} md-callout--collapsible" data-callout="${escapeHtml(norm)}" role="note">` +
      `<div class="md-callout__icon" aria-hidden="true">${emoji}</div>` +
      `<div class="md-callout__inner">` +
      `<details class="md-callout__details"${openAttr}>` +
      `<summary class="md-callout__title">${escapeHtml(title)}</summary>` +
      `<div class="md-callout__content">${innerHtml}</div>` +
      `</details>` +
      `</div>` +
      `</div>\n\n`
    )
  }

  return (
    `<div class="md-callout md-callout--${escapeHtml(norm)}" data-callout="${escapeHtml(norm)}" role="note">` +
    `<div class="md-callout__icon" aria-hidden="true">${emoji}</div>` +
    `<div class="md-callout__inner">` +
    `<div class="md-callout__title">${escapeHtml(title)}</div>` +
    `<div class="md-callout__content">${innerHtml}</div>` +
    `</div>` +
    `</div>\n\n`
  )
}

export type CalloutBlock = {
  type: string
  title: string
  bodyMd: string
  start: number
  end: number
  /** 块引用 `> [!tip]` 或 Wiki 行 `[[!tip]]` */
  kind: 'bq' | 'wiki'
  collapsible?: boolean
  defaultOpen?: boolean
}

type ParsedCalloutHeader = {
  type: string
  collapsible: boolean
  defaultOpen: boolean
  rest: string
}

/** 剥一层块引用前缀，保留更深嵌套 > */
export function stripOneBlockquotePrefix(line: string): string {
  return line.replace(/^>\s?/, '')
}

function parseBqCalloutHeader(line: string): ParsedCalloutHeader | null {
  const m = line.match(/^>\s*\[!([a-zA-Z][a-zA-Z0-9_-]*)\]([-+])?\s*(.*)$/i)
  if (!m) return null
  const fold = m[2]
  return {
    type: normalizeCalloutType(m[1]!),
    collapsible: fold === '+' || fold === '-',
    defaultOpen: fold !== '-',
    rest: m[3]?.trim() ?? '',
  }
}

function parseWikiCalloutHeader(line: string): ParsedCalloutHeader | null {
  const m = line.match(/^\[\[!([a-zA-Z][a-zA-Z0-9_-]*)\]([-+])?(?:\|([^\]]+))?\]\s*$/i)
  if (!m) return null
  const fold = m[2]
  return {
    type: normalizeCalloutType(m[1]!),
    collapsible: fold === '+' || fold === '-',
    defaultOpen: fold !== '-',
    rest: m[3]?.trim() ?? '',
  }
}

function resolveCalloutTitleBody(
  type: string,
  rest: string,
  bodyLines: string[],
): { title: string; bodyMd: string } {
  const hasContinuation = bodyLines.length > 0
  if (!hasContinuation) {
    return {
      title: defaultCalloutTitle(type),
      bodyMd: rest,
    }
  }
  return {
    title: rest || defaultCalloutTitle(type),
    bodyMd: bodyLines.join('\n').trimEnd(),
  }
}

type FenceState = { inFence: boolean; fenceChar: string; bqPrefixed: boolean }

function updateFenceState(
  content: string,
  state: FenceState,
  lineHadBq = false,
): void {
  const open = content.match(/^(`{3,}|~{3,})/)
  if (open) {
    const ch = open[1]![0]!
    if (!state.inFence) {
      state.inFence = true
      state.fenceChar = ch
      state.bqPrefixed = lineHadBq
    } else if (content.trimStart().startsWith(ch.repeat(3))) {
      state.inFence = false
      state.fenceChar = ''
      state.bqPrefixed = false
    }
  }
}

/** 收集 Obsidian 块引用 Callout 正文（围栏内可含无 > 前缀的行） */
export function collectBqCalloutBodyLines(
  lines: string[],
  startLine: number,
): { bodyLines: string[]; endLine: number } {
  const bodyLines: string[] = []
  let i = startLine
  const fence: FenceState = { inFence: false, fenceChar: '', bqPrefixed: false }

  while (i < lines.length) {
    const line = lines[i]!
    const hasBq = /^>\s?/.test(line)

    if (fence.inFence) {
      const content = hasBq ? stripOneBlockquotePrefix(line) : line
      bodyLines.push(content)
      updateFenceState(content, fence, hasBq)
      i++
      continue
    }

    if (!hasBq) break

    if (parseBqCalloutHeader(line)) break

    const content = stripOneBlockquotePrefix(line)
    updateFenceState(content, fence, true)

    bodyLines.push(content)
    i++
  }

  return { bodyLines, endLine: i }
}

function lineIndexAtOffset(blockText: string, blockStart: number, lineFrom: number): number {
  const rel = Math.max(0, lineFrom - blockStart)
  const before = blockText.slice(0, rel)
  return before.split(/\r?\n/).length - 1
}

/**
 * Obsidian 块引用 Callout 内按 Enter 时下一行前缀。
 * - 正文行续 `> `
 * - `> ``` ` 围栏：围栏内各行（含空行、闭合行）续 `> `
 * - 无 `>` 的旧式围栏：围栏内正文行不加重定向
 * - 围栏结束后恢复 `> `
 * - 空 `> ` 行返回 null：删除该行并退出 Callout
 */
export function getBqCalloutEnterPrefix(
  block: CalloutBlock,
  doc: string,
  lineFrom: number,
  lineText: string,
): string | null {
  if (block.kind !== 'bq') return ''
  if (/^>\s?$/.test(lineText)) {
    const blockText = doc.slice(block.start, block.end)
    const blockLines = blockText.split(/\r?\n/)
    const lineIndex = lineIndexAtOffset(blockText, block.start, lineFrom)
    const fence: FenceState = { inFence: false, fenceChar: '', bqPrefixed: false }
    for (let i = 0; i < lineIndex; i++) {
      const raw = blockLines[i] ?? ''
      const hasBq = /^>\s?/.test(raw)
      const content = hasBq ? stripOneBlockquotePrefix(raw) : raw
      updateFenceState(content, fence, hasBq)
    }
    if (fence.inFence && fence.bqPrefixed) return '> '
    return null
  }

  const blockText = doc.slice(block.start, block.end)
  const blockLines = blockText.split(/\r?\n/)
  const lineIndex = lineIndexAtOffset(blockText, block.start, lineFrom)

  const fence: FenceState = { inFence: false, fenceChar: '', bqPrefixed: false }
  for (let i = 0; i < lineIndex; i++) {
    const raw = blockLines[i] ?? ''
    const lineHadBq = /^>\s?/.test(raw)
    const content = lineHadBq ? stripOneBlockquotePrefix(raw) : raw
    updateFenceState(content, fence, lineHadBq)
  }

  const hasBq = /^>\s?/.test(lineText)
  const currentContent = hasBq ? stripOneBlockquotePrefix(lineText) : lineText

  const openingFence =
    !fence.inFence && /^(`{3,}|~{3,})/.test(currentContent.trimStart())
  if (openingFence) return hasBq ? '> ' : ''

  const wasInFence = fence.inFence
  const wasBqPrefixed = fence.bqPrefixed
  updateFenceState(currentContent, fence, hasBq)

  if (wasInFence && !fence.inFence) return '> '

  if (fence.inFence) return wasBqPrefixed || fence.bqPrefixed ? '> ' : ''

  if (hasBq) return '> '

  return ''
}

export function findCalloutBlocks(markdown: string): CalloutBlock[] {
  const masked = maskMarkdownForWikilinkScan(markdown)
  const lines = markdown.split(/\r?\n/)
  const maskedLines = masked.split(/\r?\n/)
  const blocks: CalloutBlock[] = []

  let charOffset = 0
  const lineStarts: number[] = []
  for (const line of lines) {
    lineStarts.push(charOffset)
    charOffset += line.length + 1
  }

  let i = 0
  while (i < lines.length) {
    const wikiHeader = parseWikiCalloutHeader(lines[i]!)
    const bqHeader = !wikiHeader ? parseBqCalloutHeader(lines[i]!) : null
    const header = wikiHeader ?? bqHeader

    if (!header && maskedLines[i] !== lines[i] && lines[i]!.trim()) {
      i++
      continue
    }

    if (header) {
      const bodyLines: string[] = []
      const startLine = i
      i++

      if (wikiHeader) {
        while (i < lines.length) {
          if (!lines[i]!.trim()) break
          if (parseWikiCalloutHeader(lines[i]!) || parseBqCalloutHeader(lines[i]!)) break
          bodyLines.push(lines[i]!)
          i++
        }
      } else {
        const collected = collectBqCalloutBodyLines(lines, i)
        bodyLines.push(...collected.bodyLines)
        i = collected.endLine
      }

      const { title, bodyMd } = resolveCalloutTitleBody(
        header.type,
        header.rest,
        bodyLines,
      )

      const start = lineStarts[startLine] ?? 0
      const end =
        i < lines.length ? (lineStarts[i] ?? markdown.length) : markdown.length

      blocks.push({
        type: header.type,
        title,
        bodyMd,
        start,
        end,
        kind: wikiHeader ? 'wiki' : 'bq',
        collapsible: header.collapsible,
        defaultOpen: header.defaultOpen,
      })
      continue
    }

    i++
  }

  return blocks
}

/** 光标是否落在 Callout 块内（含块末、文档 EOF 且无尾随换行） */
export function findCalloutBlockAtPosition(
  markdown: string,
  pos: number,
): CalloutBlock | undefined {
  if (pos < 0) return undefined
  const len = markdown.length
  const blocks = findCalloutBlocks(markdown)
  return blocks.find((b) => {
    if (pos < b.start) return false
    if (pos < b.end) return true
    return pos === b.end && pos === len
  })
}

/** 将 Obsidian Callout（> [!tip] 与 [[!tip]]）转为 HTML 块；inner 由 marked+shiki 渲染 */
export async function transformMarkdownCallouts(
  markdown: string,
  renderInner: (md: string) => Promise<string>,
): Promise<string> {
  const blocks = findCalloutBlocks(markdown)
  if (!blocks.length) return markdown

  let out = ''
  let cursor = 0
  for (const block of blocks) {
    out += markdown.slice(cursor, block.start)
    const innerHtml = block.bodyMd ? await renderInner(block.bodyMd) : ''
    out += buildCalloutHtml(block.type, block.title, innerHtml, {
      collapsible: block.collapsible,
      defaultOpen: block.defaultOpen,
    })
    cursor = block.end
  }
  out += markdown.slice(cursor)
  return out
}
