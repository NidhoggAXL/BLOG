import type { Completion, CompletionContext, CompletionSource } from '@codemirror/autocomplete'
import {
  applyWikilinkAutocompleteSelection,
  filterWikilinkLinkOptions,
  getWikilinkAutocompleteContext,
  type WikilinkLinkOption,
} from '~/composables/useWikilinkTextareaAutocomplete'

export function createWikilinkCompletionSource(
  getLinkOptions: () => WikilinkLinkOption[],
  getExcludeSlugs: () => Set<string> = () => new Set(),
): CompletionSource {
  return (context: CompletionContext) => {
    const doc = context.state.doc.toString()
    const pos = context.pos
    const wikilinkCtx = getWikilinkAutocompleteContext(doc, pos)
    if (!wikilinkCtx) return null

    const items = filterWikilinkLinkOptions(
      getLinkOptions(),
      wikilinkCtx.query,
      getExcludeSlugs(),
    )
    if (!items.length) return null

    const options: Completion[] = items.map((opt) => ({
      label: opt.label,
      detail: opt.directoryPath ?? opt.value,
      apply(view, _completion, _from, to) {
        const current = view.state.doc.toString()
        const ctx = getWikilinkAutocompleteContext(current, to) ?? wikilinkCtx
        const { text, cursor } = applyWikilinkAutocompleteSelection(current, ctx, opt.value)
        view.dispatch({
          changes: { from: ctx.openIdx, to, insert: text.slice(ctx.openIdx, cursor) },
          selection: { anchor: cursor },
        })
      },
    }))

    return {
      from: wikilinkCtx.queryStart,
      to: pos,
      options,
      validFor: /^[^\]]*$/,
    }
  }
}
