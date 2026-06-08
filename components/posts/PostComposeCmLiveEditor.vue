<script setup lang="ts">
import { autocompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownKeymap } from "@codemirror/lang-markdown";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language";
import {
  composeMdSourceHighlightDark,
  composeMdSourceHighlightLight,
} from "~/utils/composeMdSourceHighlight";
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  placeholder as cmPlaceholder,
  tooltips,
} from "@codemirror/view";
import { GFM } from "@lezer/markdown";
import {
  collapseOnSelectionFacet,
  codeBlockField,
  editorTheme,
  imageField,
  initHighlighter,
  linkPlugin,
  livePreviewPlugin,
  markdownStylePlugin,
  mouseSelectingField,
  registerLanguage,
  setMouseSelecting,
  tableField,
} from "codemirror-live-markdown";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import { createWikilinkCompletionSource } from "~/composables/useWikilinkCodemirrorCompletion";
import type { WikilinkLinkOption } from "~/composables/useWikilinkTextareaAutocomplete";
import { composeCalloutPreviewExtension } from "~/utils/composeCmCalloutPreview";
import { composeMdFenceAutoComplete } from "~/utils/composeCmFenceAutoComplete";
import { composeCmCalloutKeymap } from "~/utils/composeCmCalloutEnter";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    sourceMode?: boolean;
    placeholder?: string;
    linkOptions?: WikilinkLinkOption[];
    excludeSlugs?: string[];
  }>(),
  {
    sourceMode: false,
    placeholder: "开始写作… 输入 [[ 可联想已有文章",
    linkOptions: () => [],
    excludeSlugs: () => [],
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  ready: [view: EditorView];
}>();

const siteTheme = useAppTheme();
const router = useRouter();
const hostRef = ref<HTMLDivElement | null>(null);
const editorView = shallowRef<EditorView | null>(null);
const highlighterReady = ref(false);

const livePreviewCompartment = new Compartment();
const collapseCompartment = new Compartment();
const calloutCompartment = new Compartment();
const codeBlockCompartment = new Compartment();
const highlightCompartment = new Compartment();
const fenceAutoCompleteCompartment = new Compartment();
const calloutKeymapCompartment = new Compartment();
const sourceKeymapCompartment = new Compartment();
const themeCompartment = new Compartment();

const wikilinkSource = createWikilinkCompletionSource(
  () => props.linkOptions,
  () => new Set(props.excludeSlugs),
);

function livePreviewOn() {
  return !props.sourceMode;
}

function livePreviewExtensions(on: boolean) {
  if (!on) return [];
  return [
    livePreviewPlugin,
    markdownStylePlugin,
    tableField,
    imageField(),
    linkPlugin({
      openInNewTab: true,
      onWikiLinkClick: (link) => {
        const slug = link.trim();
        if (slug) void router.push(`/admin/posts/${encodeURIComponent(slug)}`);
      },
    }),
  ];
}

/** 源码模式下禁用代码块预览 widget，否则无法直接编辑围栏代码 */
function codeBlockExtensions(on: boolean) {
  if (!on) return [];
  return [codeBlockField({ copyButton: false })];
}

function sourceModeContentTheme(isDark: boolean) {
  if (!props.sourceMode) return {};
  return isDark
    ? {
        ".cm-content": {
          color: "#e5e7eb",
          caretColor: "#93c5fd",
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(255, 255, 255, 0.06)",
        },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
          backgroundColor: "rgba(91, 140, 255, 0.32) !important",
        },
        ".cm-cursor": {
          borderLeftColor: "#93c5fd",
        },
      }
    : {
        ".cm-content": {
          color: "#1e293b",
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(61, 94, 255, 0.06)",
        },
      };
}

function adminEditorTheme(isDark: boolean) {
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        backgroundColor:
          props.sourceMode && isDark
            ? "var(--compose-md-source-bg, #12151c)"
            : "var(--post-read-surface, var(--el-fill-color-blank))",
      },
      ".cm-scroller": {
        fontFamily: "inherit",
        overflow: "auto",
      },
      ".cm-content": {
        color: "var(--post-read-text, var(--admin-text))",
        caretColor: "var(--el-color-primary)",
        fontSize: props.sourceMode ? "14px" : "17px",
        lineHeight: props.sourceMode ? "1.65" : "1.8",
        padding: props.sourceMode
          ? "12px"
          : "var(--post-read-content-pad-y, 20px) var(--post-read-content-pad-x, 50px)",
        maxWidth: "none",
        boxSizing: "border-box",
      },
      ".cm-line": {
        padding: "0",
        lineHeight: props.sourceMode ? "1.65" : "1.8",
        fontSize: props.sourceMode ? "14px" : "17px",
      },
      ".cm-gutters": {
        display: "none",
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: "var(--el-color-primary)",
      },
      ".cm-activeLine": {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      },
      ...sourceModeContentTheme(isDark),
      ".cm-codeblock-widget": {
        backgroundColor: "var(--post-read-pre-bg)",
        border: "1px solid var(--post-read-border)",
        borderRadius: "10px",
      },
      ".cm-codeblock-widget pre": {
        backgroundColor: "var(--post-read-pre-bg)",
      },
    },
    { dark: isDark },
  );
}

function highlightExtensions() {
  if (!props.sourceMode) {
    return [syntaxHighlighting(defaultHighlightStyle, { fallback: true })];
  }
  const isDark = siteTheme.resolvedTheme.value === "dark";
  return [
    syntaxHighlighting(
      isDark ? composeMdSourceHighlightDark : composeMdSourceHighlightLight,
      { fallback: true },
    ),
  ];
}

function adminCssVariables(isDark: boolean) {
  return EditorView.theme(
    {
      "&": {
        "--md-heading": "var(--post-read-heading)",
        "--md-bold": "var(--post-read-heading)",
        "--md-italic": "var(--post-read-text)",
        "--md-link": "var(--post-read-link)",
        "--md-code-bg": "var(--post-read-code-bg)",
        "--md-strikethrough": "var(--post-read-muted)",
      },
    },
    { dark: isDark },
  );
}

function sourceModeKeymap() {
  if (!props.sourceMode) return [];
  return markdownKeymap;
}

function editorKeymaps() {
  // 让 Markdown 专用按键（如 Enter 续写列表前缀）优先生效
  return [...sourceModeKeymap(), ...defaultKeymap, ...historyKeymap];
}

function fenceAutoCompleteExtensions() {
  return [composeMdFenceAutoComplete()];
}

function calloutKeymapExtensions() {
  return [composeCmCalloutKeymap()];
}

function buildExtensions() {
  const isDark = siteTheme.resolvedTheme.value === "dark";
  const liveOn = livePreviewOn();

  return [
    history(),
    drawSelection(),
    highlightActiveLine(),
    sourceKeymapCompartment.of(keymap.of(editorKeymaps())),
    markdown({ extensions: [GFM], addKeymap: false }),
    fenceAutoCompleteCompartment.of(fenceAutoCompleteExtensions()),
    calloutKeymapCompartment.of(calloutKeymapExtensions()),
    collapseCompartment.of(collapseOnSelectionFacet.of(liveOn)),
    livePreviewCompartment.of(livePreviewExtensions(liveOn)),
    calloutCompartment.of(
      composeCalloutPreviewExtension(() => livePreviewOn()),
    ),
    codeBlockCompartment.of(codeBlockExtensions(liveOn)),
    mouseSelectingField,
    editorTheme,
    themeCompartment.of([adminEditorTheme(isDark), adminCssVariables(isDark)]),
    highlightCompartment.of(highlightExtensions()),
    autocompletion({ override: [wikilinkSource], icons: false }),
    cmPlaceholder(props.placeholder),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({
      class: props.sourceMode ? "compose-md-source" : "post-read markdown-body",
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        emit("update:modelValue", update.state.doc.toString());
      }
    }),
  ];
}

function bindMouseSelecting(view: EditorView) {
  const onMouseDown = () => {
    view.dispatch({ effects: setMouseSelecting.of(true) });
  };
  const onMouseUp = () => {
    requestAnimationFrame(() => {
      view.dispatch({ effects: setMouseSelecting.of(false) });
    });
  };
  view.contentDOM.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  return () => {
    view.contentDOM.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mouseup", onMouseUp);
  };
}

let unbindMouse: (() => void) | null = null;

async function ensureHighlighter() {
  if (highlighterReady.value) return;
  await initHighlighter();
  registerLanguage("javascript", javascript);
  registerLanguage("js", javascript);
  registerLanguage("typescript", typescript);
  registerLanguage("ts", typescript);
  registerLanguage("python", python);
  registerLanguage("bash", bash);
  registerLanguage("shell", bash);
  registerLanguage("css", css);
  registerLanguage("json", json);
  highlighterReady.value = true;
}

function createView() {
  const el = hostRef.value;
  if (!el) return;

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [...buildExtensions(), tooltips({ parent: el })],
  });

  const view = new EditorView({ state, parent: el });
  editorView.value = view;
  unbindMouse = bindMouseSelecting(view);
  emit("ready", view);
}

function destroyView() {
  unbindMouse?.();
  unbindMouse = null;
  editorView.value?.destroy();
  editorView.value = null;
}

function reconfigureLivePreview() {
  const view = editorView.value;
  if (!view) return;
  const liveOn = livePreviewOn();
  view.dispatch({
    effects: [
      livePreviewCompartment.reconfigure(livePreviewExtensions(liveOn)),
      collapseCompartment.reconfigure(collapseOnSelectionFacet.of(liveOn)),
      calloutCompartment.reconfigure(
        composeCalloutPreviewExtension(() => livePreviewOn()),
      ),
      codeBlockCompartment.reconfigure(codeBlockExtensions(liveOn)),
    ],
  });
}

function reconfigureTheme() {
  const view = editorView.value;
  if (!view) return;
  const isDark = siteTheme.resolvedTheme.value === "dark";
  view.dispatch({
    effects: [
      themeCompartment.reconfigure([
        adminEditorTheme(isDark),
        adminCssVariables(isDark),
      ]),
      highlightCompartment.reconfigure(highlightExtensions()),
    ],
  });
}

watch(
  () => props.modelValue,
  (v) => {
    const view = editorView.value;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (v !== cur) {
      view.dispatch({
        changes: { from: 0, to: cur.length, insert: v },
      });
    }
  },
);

function reconfigureSourceModeHelpers() {
  const view = editorView.value;
  if (!view) return;
  view.dispatch({
    effects: [
      fenceAutoCompleteCompartment.reconfigure(fenceAutoCompleteExtensions()),
      calloutKeymapCompartment.reconfigure(calloutKeymapExtensions()),
      sourceKeymapCompartment.reconfigure(
        keymap.of(editorKeymaps()),
      ),
    ],
  });
}

watch(
  () => props.sourceMode,
  () => {
    reconfigureLivePreview();
    reconfigureTheme();
    reconfigureSourceModeHelpers();
  },
);

watch(
  siteTheme.resolvedTheme,
  () => reconfigureTheme(),
);

onMounted(async () => {
  await ensureHighlighter();
  nextTick(createView);
});

onBeforeUnmount(destroyView);

function getEditorView() {
  return editorView.value;
}

function focus() {
  editorView.value?.focus();
}

defineExpose({ getEditorView, focus });
</script>

<template>
  <div ref="hostRef" class="compose-cm-live-editor" />
</template>

<style scoped lang="less">
.compose-cm-live-editor {
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;

  :deep(.cm-editor) {
    height: 100%;
    min-height: 0;
  }

  :deep(.cm-scroller) {
    height: 100%;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
  }

  :deep(.cm-callout-preview) {
    display: block;
    width: 100%;
    max-width: 100%;
    margin: 0.25em 0;
    box-sizing: border-box;
    writing-mode: horizontal-tb;
    transform: none;
  }

  :deep(.cm-callout-preview .md-callout) {
    width: 100%;
    max-width: 100%;
    margin: 0;
    transform: none;
  }

}
</style>
