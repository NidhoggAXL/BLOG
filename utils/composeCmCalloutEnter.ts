import { Prec, type Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import {
  findCalloutBlockAtPosition,
  getBqCalloutEnterPrefix,
  type CalloutBlock,
} from '~/utils/markdownCallouts'

export type CalloutNewlinePlan = {
  from: number
  to?: number
  insert: string
  selection: number
}

function planMarkdownListNewline(
  pos: number,
  lineText: string,
  lineTo: number,
): CalloutNewlinePlan | null {
  // 块引用内的列表交给现有块引用/Callout 逻辑处理
  if (/^\s*>/.test(lineText)) return null
  // 仅在行尾 Enter 时续写列表，避免干扰行内编辑
  if (pos < lineTo) return null

  const unordered = lineText.match(/^(\s*)([-*+])\s+(.*)$/)
  if (unordered && unordered[3].trim()) {
    const prefix = `${unordered[1]}${unordered[2]} `
    const insert = `\n${prefix}`
    return { from: lineTo, insert, selection: lineTo + insert.length }
  }

  const ordered = lineText.match(/^(\s*)(\d+)\.\s+(.*)$/)
  if (ordered && ordered[3].trim()) {
    const next = Number(ordered[2]) + 1
    const prefix = `${ordered[1]}${next}. `
    const insert = `\n${prefix}`
    return { from: lineTo, insert, selection: lineTo + insert.length }
  }

  return null
}

function calloutLineContinuePrefix(
  block: CalloutBlock,
  doc: string,
  lineFrom: number,
  lineText: string,
): string | null {
  if (block.kind === 'wiki') return ''
  return getBqCalloutEnterPrefix(block, doc, lineFrom, lineText)
}

/** 空 `> ` 行 Enter：删除该行并退出块引用（Obsidian） */
export function planBlockquoteExitEmptyLine(
  doc: string,
  lineFrom: number,
  lineTo: number,
): CalloutNewlinePlan {
  let from = lineFrom
  if (from > 0 && doc[from - 1] === '\n') from -= 1
  const insert = '\n'
  return { from, to: lineTo, insert, selection: from + insert.length }
}

function isBlockquoteLine(lineText: string): boolean {
  return /^>\s?/.test(lineText)
}

/** `> ` 后已有内容时，Enter 续下一行 `> `（含 Callout 正文与普通块引用） */
export function planBlockquoteNewline(
  doc: string,
  pos: number,
  lineText: string,
  lineFrom: number,
  lineTo: number,
): CalloutNewlinePlan | null {
  if (!isBlockquoteLine(lineText)) return null

  if (/^>\s?$/.test(lineText)) {
    return planBlockquoteExitEmptyLine(doc, lineFrom, lineTo)
  }

  const hasContent = /^>\s*\S/.test(lineText)
  if (!hasContent) return null

  const atLineEnd = pos >= lineTo
  const prefix = '> '

  if (atLineEnd) {
    const insert = `\n${prefix}`
    return { from: lineTo, insert, selection: lineTo + insert.length }
  }

  const insert = `\n${prefix}`
  return { from: pos, insert, selection: pos + insert.length }
}

export function planEditorBqEnter(
  doc: string,
  pos: number,
  lineText: string,
  lineFrom: number,
  lineTo: number,
): CalloutNewlinePlan | null {
  return (
    planCalloutNewline(doc, pos, lineText, lineFrom, lineTo) ??
    planBlockquoteNewline(doc, pos, lineText, lineFrom, lineTo)
  )
}

/**
 * 计算 Callout 内 Enter 应插入的文本。
 * @returns null 表示不在 Callout 内，应交还默认行为
 */
export function planCalloutNewline(
  doc: string,
  pos: number,
  lineText: string,
  lineFrom: number,
  lineTo: number,
): CalloutNewlinePlan | null {
  const block = findCalloutBlockAtPosition(doc, pos)
  if (!block) return null

  const atLineEnd = pos >= lineTo
  const prefix = calloutLineContinuePrefix(block, doc, lineFrom, lineText)

  if (prefix === null) {
    return planBlockquoteExitEmptyLine(doc, lineFrom, lineTo)
  }

  if (atLineEnd) {
    const insert = `\n${prefix}`
    return { from: lineTo, insert, selection: lineTo + insert.length }
  }

  const insert = `\n${prefix}`
  return { from: pos, insert, selection: pos + insert.length }
}

function applyNewlinePlan(view: EditorView, plan: CalloutNewlinePlan) {
  view.dispatch({
    changes: { from: plan.from, to: plan.to ?? plan.from, insert: plan.insert },
    selection: { anchor: plan.selection },
    scrollIntoView: true,
    userEvent: 'input',
  })
}

/**
 * Obsidian Callout 编辑：Enter 续 `> `、围栏内 `> ` 代码块、空 `> ` 行退出。
 */
export function composeCmCalloutKeymap(): Extension {
  return Prec.high(
    keymap.of([
      {
        key: 'Enter',
        run(view: EditorView) {
          const { head, empty } = view.state.selection.main
          if (!empty) return false

          const line = view.state.doc.lineAt(head)
          const listPlan = planMarkdownListNewline(
            head,
            line.text,
            line.to,
          )
          if (listPlan) {
            applyNewlinePlan(view, listPlan)
            return true
          }

          const plan = planEditorBqEnter(
            view.state.doc.toString(),
            head,
            line.text,
            line.from,
            line.to,
          )
          if (!plan) return false

          applyNewlinePlan(view, plan)
          return true
        },
      },
      {
        key: 'Backspace',
        run(view: EditorView) {
          const { head, empty } = view.state.selection.main
          if (!empty) return false

          const line = view.state.doc.lineAt(head)
          if (!/^>\s?$/.test(line.text) || head !== line.to) return false

          let from = line.from
          const to = line.to
          if (from > 0 && view.state.doc.sliceString(from - 1, from) === '\n') {
            from -= 1
          }
          view.dispatch({
            changes: { from, to, insert: '' },
            selection: { anchor: from },
            userEvent: 'delete',
          })
          return true
        },
      },
    ]),
  )
}
