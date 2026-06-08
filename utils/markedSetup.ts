import { Marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";
import {
  buildCalloutHtml,
  findCalloutBlocks,
} from "~/utils/markdownCallouts";
import { createHeadingAnchorId } from "~/utils/markdownAnchorSlice";

const SHIKI_LANGS = [
  "javascript",
  "typescript",
  "json",
  "bash",
  "shell",
  "sql",
  "markdown",
  "html",
  "css",
  "less",
  "scss",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "php",
  "yaml",
  "xml",
  "vue",
  "text",
  "plaintext",
] as const;

const SHIKI_THEMES = { light: "github-light", dark: "github-dark" } as const;

/**
 * 与 Obsidian「严格换行」关闭时一致：段落内单个换行符在预览/阅读中渲染为换行（`<br>`），
 * 段落之间仍需空一行（双换行）。
 */
export const MARKDOWN_OBSIDIAN_LINE_BREAKS = true;

let highlighterPromise: Promise<Highlighter> | null = null;
let markedInstance: Marked | null = null;
/** 单次 parse 内复用，保证标题 id 与大纲锚点一致 */
let headingAnchorIds: Map<string, number> | null = null;

function plainHeadingText(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
      langs: [...SHIKI_LANGS],
    });
  }
  return highlighterPromise;
}

function extractShikiCodeInner(full: string): string {
  const m = full.match(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/i);
  return m?.[1] ?? full;
}

async function highlightToInnerHtml(
  code: string,
  lang: string | undefined,
): Promise<string> {
  const highlighter = await getHighlighter();
  const language = lang?.trim() || "text";
  try {
    const full = highlighter.codeToHtml(code, {
      lang: language,
      themes: SHIKI_THEMES,
      defaultColor: false,
    });
    return extractShikiCodeInner(full);
  } catch {
    try {
      const full = highlighter.codeToHtml(code, {
        lang: "text",
        themes: SHIKI_THEMES,
        defaultColor: false,
      });
      return extractShikiCodeInner(full);
    } catch {
      return escapeHtml(code);
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getMarked(): Marked {
  if (markedInstance) return markedInstance;

  const instance = new Marked({
    gfm: true,
    breaks: MARKDOWN_OBSIDIAN_LINE_BREAKS,
  });

  instance.use({
    async: true,
    async walkTokens(token) {
      if (token.type !== "code") return;
      const lang = (token.lang || "").match(/\S*/)?.[0];
      token.text = await highlightToInnerHtml(token.text, lang);
      token.escaped = true;
    },
    renderer: {
      heading({ text, depth }) {
        const plain = plainHeadingText(String(text));
        const used = headingAnchorIds ?? new Map<string, number>();
        const id = createHeadingAnchorId(plain, used);
        return `<h${depth} id="${escapeHtmlAttr(id)}">${text}</h${depth}>\n`;
      },
      code({ text, lang, escaped }) {
        const langLabel = (lang || "").match(/\S*/)?.[0] || "text";
        const classAttr = langLabel ? ` class="language-${langLabel}"` : "";
        const body =
          escaped && typeof text === "string" ? text : escapeHtml(String(text));
        return `<pre class="shiki shiki-themes github-light github-dark" data-lang="${langLabel}"><code${classAttr}>${body}</code></pre>\n`;
      },
    },
  });

  markedInstance = instance;
  return instance;
}

export async function parseMarkdownFragmentToHtml(
  markdown: string,
): Promise<string> {
  const marked = getMarked();
  headingAnchorIds = new Map<string, number>();
  try {
    return (await marked.parse(markdown)) as string;
  } finally {
    headingAnchorIds = null;
  }
}

export async function parseMarkdownToHtml(markdown: string): Promise<string> {
  return renderMarkdownPipeline(markdown);
}

/** 分段 marked 渲染，Callout HTML 不再二次 parse，避免预览丢失 */
export async function renderMarkdownPipeline(
  markdown: string,
  applyLinks?: (md: string) => string,
): Promise<string> {
  const blocks = findCalloutBlocks(markdown);
  if (!blocks.length) {
    let md = markdown;
    if (applyLinks) md = applyLinks(md);
    if (!md.trim()) return "";
    return parseMarkdownFragmentToHtml(md);
  }

  let out = "";
  let cursor = 0;

  for (const block of blocks) {
    let segment = markdown.slice(cursor, block.start);
    if (applyLinks) segment = applyLinks(segment);
    if (segment.trim()) {
      out += await parseMarkdownFragmentToHtml(segment);
    }

    let bodyMd = block.bodyMd;
    if (applyLinks && bodyMd) bodyMd = applyLinks(bodyMd);
    const innerHtml = bodyMd.trim()
      ? await parseMarkdownFragmentToHtml(bodyMd)
      : "";

    out += buildCalloutHtml(block.type, block.title, innerHtml, {
      collapsible: block.collapsible,
      defaultOpen: block.defaultOpen,
    });
    cursor = block.end;
  }

  let tail = markdown.slice(cursor);
  if (applyLinks) tail = applyLinks(tail);
  if (tail.trim()) {
    out += await parseMarkdownFragmentToHtml(tail);
  }

  return out;
}

export function ensureMarkedConfigured() {
  getMarked();
}

/** 客户端空闲时预热 Shiki，降低首屏 Markdown 渲染等待 */
export function preloadMarkedHighlighter() {
  void getHighlighter();
}
