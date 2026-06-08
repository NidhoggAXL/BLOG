import { syntaxTree } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { findCalloutBlockAtPosition } from '~/utils/markdownCallouts'

const OPEN_FENCE_LINE = /^(\s*)```([\w-]*)$/
const BQ_OPEN_FENCE_LINE = /^>\s*```([\w-]*)$/

function isInsideFencedCode(state: import('@codemirror/state').EditorState, pos: number) {
  const node = syntaxTree(state).resolveInner(pos, -1)
  for (let cur = node; cur; cur = cur.parent) {
    if (cur.name === 'FencedCode') return true
  }
  return false
}

/**
 * 行首第三个 ` 时补全围栏；Callout 内 `> ``` ` 补全为 Obsidian 风格：
 * > ```
 * >
 * > ```
 */
export function composeMdFenceAutoComplete(): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    if (text !== '`') return false

    const { state } = view
    const line = state.doc.lineAt(from)
    const before = state.doc.sliceString(line.from, from)
    const after = state.doc.sliceString(from, line.to)
    const lineAfter = `${before}\`${after}`

    const bqMatch = lineAfter.match(BQ_OPEN_FENCE_LINE)
    if (bqMatch) {
      if (isInsideFencedCode(state, from)) return false
      const inCallout = !!findCalloutBlockAtPosition(state.doc.toString(), from)
      if (!inCallout) return false

      const suffix = '\n> \n> ```'
      const cursor = from + 1
      view.dispatch({
        changes: { from, to, insert: `\`${suffix}` },
        selection: { anchor: cursor },
        scrollIntoView: true,
        userEvent: 'input.type',
      })
      return true
    }

    if (!/^[^\S\n]*``$/.test(before)) return false
    if (!OPEN_FENCE_LINE.test(lineAfter)) return false
    if (isInsideFencedCode(state, from)) return false

    const suffix = '\n```'
    const cursor = from + 1
    view.dispatch({
      changes: { from, to, insert: `\`${suffix}` },
      selection: { anchor: cursor },
      scrollIntoView: true,
      userEvent: 'input.type',
    })
    return true
  })
}
