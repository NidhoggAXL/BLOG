import { findCalloutBlocks } from '~/utils/markdownCallouts'

/**
 * 将 Markdown 正文整理为常见规范写法（不改动围栏代码块内部内容）。
 */
export function formatComposeMarkdown(source: string): string {
  if (!source.trim()) return source

  const parts = splitFencedCodeBlocks(source)
  const formatted = joinFormattedSegments(parts)

  return formatted.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

function hasSubstantiveSegment(part: Segment | undefined): boolean {
  return !!part?.raw.trim()
}

/** 确保字符串末尾有一个空行（即结尾为 \\n\\n） */
function ensureTrailingBlankLine(s: string): string {
  if (s.endsWith('\n\n')) return s
  if (s.endsWith('\n')) return `${s}\n`
  return `${s}\n\n`
}

function normalizeFencedCodeBlock(raw: string): string {
  return raw.replace(/\r\n/g, '\n')
}

/** 代码块之后是否还需空行（跳过仅含换行的文本段，以处理连续围栏块） */
function needsGapAfterCodeBlock(parts: Segment[], codeIndex: number): boolean {
  for (let j = codeIndex + 1; j < parts.length; j++) {
    const p = parts[j]
    if (p.type === 'code') return true
    if (hasSubstantiveSegment(p)) return true
    if (p.type === 'text' && !p.raw.trim()) continue
    return false
  }
  return false
}

function joinFormattedSegments(parts: Segment[]): string {
  let out = ''

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const chunk =
      part.type === 'code'
        ? normalizeFencedCodeBlock(part.raw)
        : formatMarkdownSegment(part.raw)

    if (part.type === 'code') {
      if (out.length > 0) {
        out = ensureTrailingBlankLine(out)
      }
      out += chunk
      if (needsGapAfterCodeBlock(parts, i)) {
        out = ensureTrailingBlankLine(out)
      }
    } else {
      out += chunk
    }
  }

  return out
}

type Segment = { type: 'text' | 'code'; raw: string }

function splitFencedCodeBlocks(source: string): Segment[] {
  const segments: Segment[] = []
  const re = /(^|\n)(```[^\n]*\n[\s\S]*?(?:\n```|$))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(source)) !== null) {
    const start = match.index + match[1].length
    const end = start + match[2].length
    if (start > lastIndex) {
      segments.push({ type: 'text', raw: source.slice(lastIndex, start) })
    }
    segments.push({ type: 'code', raw: source.slice(start, end) })
    lastIndex = end
  }

  if (lastIndex < source.length) {
    segments.push({ type: 'text', raw: source.slice(lastIndex) })
  }

  return segments.length ? segments : [{ type: 'text', raw: source }]
}

/** Callout 块仅整理行尾空白，保持 Obsidian 围栏内无 `>` 等结构 */
function formatCalloutSegment(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const quote = line.match(/^(\s*)>\s?(.*)$/)
      if (quote) {
        return `${quote[1]}> ${quote[2].replace(/[ \t]+$/, '')}`.trimEnd()
      }
      return line.replace(/[ \t]+$/, '')
    })
    .join('\n')
}

function formatMarkdownSegment(raw: string): string {
  const blocks = findCalloutBlocks(raw)
  if (blocks.length) {
    let out = ''
    let cursor = 0
    for (const block of blocks) {
      const before = raw.slice(cursor, block.start)
      out += formatPlainMarkdownSegment(before, {
        preserveTrailingBlank: endsWithBlankLine(before),
      })
      out += formatCalloutSegment(raw.slice(block.start, block.end))
      cursor = block.end
    }
    const tail = raw.slice(cursor)
    out += formatPlainMarkdownSegment(tail, {
      preserveTrailingBlank: endsWithBlankLine(tail),
    })
    return out
  }
  return formatPlainMarkdownSegment(raw)
}

/** 片段末尾是否含至少一个空行（用于保留块引用 / Callout 之间的空行） */
function endsWithBlankLine(s: string): boolean {
  return /\n(?:[ \t]*\n)+$/.test(s.replace(/\r\n/g, '\n'))
}

type LineKind =
  | 'empty'
  | 'heading'
  | 'hr'
  | 'list'
  | 'quote'
  | 'table'
  | 'indented-code'
  | 'text'

function classifyLine(line: string): LineKind {
  if (!line.trim()) return 'empty'
  if (/^#{1,6}\s/.test(line) || /^#{1,6}$/.test(line.trim())) return 'heading'
  if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) return 'hr'
  if (/^\s*([-*+]|\d+\.)\s+/.test(line)) return 'list'
  if (/^\s*>\s?/.test(line)) return 'quote'
  if (/^\s*\|.*\|/.test(line)) return 'table'
  if (/^(\t{1,}| {4,})/.test(line)) return 'indented-code'
  return 'text'
}

/** 连续两行之间是否应插入空行（符合 Markdown 段落分隔） */
function needsParagraphGap(prev: LineKind, next: LineKind): boolean {
  if (prev === 'empty' || next === 'empty') return false
  if (prev === 'heading' || next === 'heading') return false
  if (prev === 'table' && next === 'table') return false
  if (prev === 'indented-code' && next === 'indented-code') return false
  if (prev === 'list' && next === 'list') return false
  if (prev === 'quote' && next === 'quote') return false
  if (prev === 'text' && next === 'text') return true
  if (
    (prev === 'hr' || prev === 'list' || prev === 'quote' || prev === 'table' || prev === 'indented-code') &&
    next === 'text'
  ) {
    return true
  }
  return false
}

type FormatPlainOptions = {
  /** 保留段末空行（块引用与 Callout 之间的分隔） */
  preserveTrailingBlank?: boolean
}

function formatPlainMarkdownSegment(
  raw: string,
  options: FormatPlainOptions = {},
): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let prevKind: LineKind = 'empty'

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/[ \t]+$/g, '')
    const kind = classifyLine(line)

    const heading = line.match(/^(#{1,6})(\s*)(.+?)(\s+#+\s*)?$/)
    if (heading) {
      const level = heading[1]
      const text = heading[3].trim()
      line = `${level} ${text}`
      if (needsParagraphGap(prevKind, 'heading')) out.push('')
      out.push(line)
      out.push('')
      prevKind = 'heading'
      continue
    }

    const hr = line.match(/^(\*{3,}|-{3,}|_{3,})\s*$/)
    if (hr) {
      if (needsParagraphGap(prevKind, 'hr')) out.push('')
      out.push('---')
      out.push('')
      prevKind = 'hr'
      continue
    }

    const list = line.match(/^(\s*)([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?(.*)$/)
    if (list) {
      const indent = list[1]
      const marker = list[2]
      const task = list[3] ?? ''
      const body = (list[4] ?? '').trimEnd()
      const isOrdered = /^\d+\.$/.test(marker)
      const bullet = isOrdered ? marker : '-'
      line = `${indent}${bullet} ${task}${body}`.trimEnd()
      if (prevKind === 'heading' && out[out.length - 1] === '') {
        out.pop()
      } else if (needsParagraphGap(prevKind, 'list')) {
        out.push('')
      }
      out.push(line)
      prevKind = 'list'
      continue
    }

    const quote = line.match(/^(\s*)>\s?(.*)$/)
    if (quote) {
      line = `${quote[1]}> ${quote[2].trimEnd()}`.trimEnd()
      if (prevKind === 'heading' && out[out.length - 1] === '') {
        out.pop()
      } else if (needsParagraphGap(prevKind, 'quote')) {
        out.push('')
      }
      out.push(line)
      prevKind = 'quote'
      continue
    }

    if (!line.trim()) {
      if (prevKind !== 'empty' && out[out.length - 1] !== '') {
        out.push('')
      }
      prevKind = 'empty'
      continue
    }

    if (prevKind === 'heading' && out[out.length - 1] === '') {
      out.pop()
    } else if (needsParagraphGap(prevKind, kind)) {
      out.push('')
    }
    out.push(line.trimEnd())
    prevKind = kind
  }

  if (!options.preserveTrailingBlank) {
    while (out.length > 0 && out[out.length - 1] === '') out.pop()
  }
  return out.length ? `${out.join('\n')}\n` : ''
}
