import {
  StateEffect,
  StateField,
  RangeSetBuilder,
  type Extension,
} from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import {
  collapseOnSelectionFacet,
  shouldShowSource,
} from 'codemirror-live-markdown'
import {
  buildCalloutHtml,
  findCalloutBlocks,
  type CalloutBlock,
} from '~/utils/markdownCallouts'
import { parseMarkdownFragmentToHtml } from '~/utils/markedSetup'

class CalloutPreviewWidget extends WidgetType {
  constructor(readonly html: string) {
    super()
  }

  eq(other: CalloutPreviewWidget) {
    return other.html === this.html
  }

  toDOM() {
    const wrap = document.createElement('div')
    wrap.className = 'cm-callout-preview markdown-body'
    wrap.style.display = 'block'
    wrap.style.width = '100%'
    wrap.style.maxWidth = '100%'
    wrap.style.boxSizing = 'border-box'
    wrap.style.writingMode = 'horizontal-tb'
    wrap.innerHTML = this.html
    return wrap
  }

  ignoreEvent() {
    return true
  }
}

const calloutHtmlCache = new Map<string, string>()

async function calloutPreviewHtml(block: CalloutBlock): Promise<string> {
  const key = `${block.type}\0${block.title}\0${block.bodyMd}\0${block.collapsible}\0${block.defaultOpen}`
  const hit = calloutHtmlCache.get(key)
  if (hit) return hit
  const inner = block.bodyMd
    ? await parseMarkdownFragmentToHtml(block.bodyMd)
    : ''
  const html = buildCalloutHtml(block.type, block.title, inner, {
    collapsible: block.collapsible,
    defaultOpen: block.defaultOpen,
  })
  calloutHtmlCache.set(key, html)
  return html
}

function shouldRevealCalloutSource(
  state: EditorView['state'],
  from: number,
  to: number,
): boolean {
  if (state.facet(collapseOnSelectionFacet)) {
    return shouldShowSource(state, from, to)
  }
  const { from: sf, to: st } = state.selection.main
  return sf >= from && st <= to
}

const setCalloutDeco = StateEffect.define<DecorationSet>()

const calloutDecoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setCalloutDeco)) return e.value
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

/** 避免在 ViewPlugin 构造 / update 周期内同步 dispatch 导致崩溃 */
function dispatchSoon(view: EditorView, run: () => void, isAlive?: () => boolean) {
  setTimeout(() => {
    if (isAlive && !isAlive()) return
    try {
      run()
    } catch {
      /* 若仍落在更新周期内，再推迟一帧 */
      setTimeout(() => {
        if (isAlive && !isAlive()) return
        run()
      }, 0)
    }
  }, 0)
}

function buildCalloutDecorations(
  state: EditorView['state'],
  blocks: CalloutBlock[],
  htmlByBlock: Map<CalloutBlock, string>,
) {
  const builder = new RangeSetBuilder<Decoration>()
  for (const block of blocks) {
    if (shouldRevealCalloutSource(state, block.start, block.end)) continue
    const html = htmlByBlock.get(block)
    if (!html) continue
    builder.add(
      block.start,
      block.end,
      Decoration.replace({
        widget: new CalloutPreviewWidget(html),
        block: true,
      }),
    )
  }
  return builder.finish()
}

/** Obsidian Callout（> [!tip]）在 Live Preview 下用与阅读页相同的 HTML 渲染 */
export function composeCalloutPreviewExtension(enabled: () => boolean): Extension {
  return [
    calloutDecoField,
    ViewPlugin.fromClass(
      class {
        timer: ReturnType<typeof setTimeout> | null = null
        generation = 0
        alive = true

        constructor(readonly view: EditorView) {
          dispatchSoon(this.view, () => this.schedule(), () => this.alive)
        }

        update(update: ViewUpdate) {
          if (!enabled()) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
              this.clearDecorationsSoon()
            }
            return
          }
          if (update.docChanged || update.selectionSet || update.viewportChanged) {
            this.schedule()
          }
        }

        clearDecorationsSoon() {
          dispatchSoon(
            this.view,
            () => {
              this.view.dispatch({ effects: setCalloutDeco.of(Decoration.none) })
            },
            () => this.alive,
          )
        }

        schedule() {
          if (!enabled()) {
            this.clearDecorationsSoon()
            return
          }
          if (this.timer) clearTimeout(this.timer)
          this.timer = setTimeout(() => void this.rebuild(), 120)
        }

        applyDecorations(deco: DecorationSet) {
          dispatchSoon(
            this.view,
            () => {
              this.view.dispatch({ effects: setCalloutDeco.of(deco) })
            },
            () => this.alive,
          )
        }

        async rebuild() {
          const gen = ++this.generation
          const doc = this.view.state.doc.toString()
          const blocks = findCalloutBlocks(doc)
          if (!blocks.length) {
            if (gen !== this.generation) return
            this.applyDecorations(Decoration.none)
            return
          }

          const htmlByBlock = new Map<CalloutBlock, string>()
          await Promise.all(
            blocks.map(async (block) => {
              htmlByBlock.set(block, await calloutPreviewHtml(block))
            }),
          )

          if (gen !== this.generation) return
          const deco = buildCalloutDecorations(this.view.state, blocks, htmlByBlock)
          this.applyDecorations(deco)
        }

        destroy() {
          this.alive = false
          if (this.timer) clearTimeout(this.timer)
        }
      },
    ),
  ]
}
