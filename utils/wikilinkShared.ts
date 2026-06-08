/** 客户端/服务端共用的维基链接解析（不依赖 MySQL） */

export function maskMarkdownForWikilinkScan(markdown: string): string {
  let s = markdown.replace(/```[\s\S]*?```/g, (block) =>
    " ".repeat(block.length),
  );
  s = s.replace(/`[^`\n]*`/g, (block) => " ".repeat(block.length));
  return s;
}

export type WikilinkInnerParsed = {
  raw_target: string;
  link_display: string | null;
  anchor: string | null;
  slug_lookup: string;
};

export type WikilinkEmbedContent = {
  title: string;
  slug: string;
  body_html: string;
};

/** 同一篇不同 #锚 对应不同嵌入内容 */
export function wikilinkEmbedCacheKey(
  slugLookup: string,
  anchor: string | null | undefined,
): string {
  const a = anchor?.trim() ?? "";
  return `${slugLookup.toLowerCase()}\x00${a}`;
}

/** 双链匹配键的多种写法（如带 .md 后缀的文件名） */
export function expandWikilinkSlugLookups(slugLookup: string): string[] {
  const lookup = slugLookup.trim().toLowerCase();
  if (!lookup) return [];
  const out = [lookup];
  const stripped = lookup.replace(/\.(md|markdown|mdown|mkd)$/i, "");
  if (stripped !== lookup) out.push(stripped);
  return out;
}

export function parseWikilinkInner(inner: string): WikilinkInnerParsed | null {
  const trimmed = inner.trim();
  if (!trimmed) return null;
  const pipeIdx = trimmed.indexOf("|");
  const link_display =
    pipeIdx >= 0 ? trimmed.slice(pipeIdx + 1).trim() || null : null;
  const left = pipeIdx >= 0 ? trimmed.slice(0, pipeIdx).trim() : trimmed;
  const hashIdx = left.indexOf("#");
  const slug_lookup = (hashIdx >= 0 ? left.slice(0, hashIdx) : left)
    .trim()
    .toLowerCase();
  const anchor =
    hashIdx >= 0
      ? left
          .slice(hashIdx + 1)
          .trim()
          .slice(0, 191) || null
      : null;
  if (!slug_lookup) return null;
  return {
    raw_target: trimmed.slice(0, 512),
    link_display: link_display ? link_display.slice(0, 512) : null,
    anchor,
    slug_lookup: slug_lookup.slice(0, 191),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildWikilinkEmbedBlock(
  title: string,
  slug: string,
  bodyHtml: string,
  anchor: string | null,
  basePath = "/admin/posts",
): string {
  const href =
    `${basePath}/${encodeURIComponent(slug)}` +
    (anchor ? `#${encodeURIComponent(anchor)}` : "");
  return (
    `<aside class="wikilink-embed" data-embed-slug="${escapeHtml(slug)}">` +
    `<header class="wikilink-embed__header">` +
    `<a class="wikilink-embed__title" href="${href}">${escapeHtml(title)}</a>` +
    `</header>` +
    `<div class="wikilink-embed__body markdown-body">${bodyHtml}</div>` +
    `</aside>`
  );
}

/** 将 [[...]] / ![[...]] 转为链接或嵌入块（跳过代码块） */
export function applyWikilinkMarkdownLinks(
  markdown: string,
  lookupToSlug: Map<string, string>,
  options?: {
    basePath?: string;
    /** 已解析的嵌入正文（Obsidian 式 transclusion） */
    embedContentByLookup?: Map<string, WikilinkEmbedContent>;
  },
): string {
  const basePath = options?.basePath ?? "/admin/posts";
  const embedMap = options?.embedContentByLookup;
  const masked = maskMarkdownForWikilinkScan(markdown);
  const re = /(!?)\[\[([^\]\n]+)\]\]/g;
  const replacements: { start: number; end: number; replacement: string }[] =
    [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    const embed = m[1] === "!";
    const parsed = parseWikilinkInner(m[2]);
    if (!parsed) continue;
    const display =
      parsed.link_display ||
      parsed.raw_target.split("|")[0]?.trim() ||
      parsed.slug_lookup;
    const targetSlug = lookupToSlug.get(parsed.slug_lookup);
    const embedContent = embedMap?.get(
      wikilinkEmbedCacheKey(parsed.slug_lookup, parsed.anchor),
    );
    let replacement: string;

    if (embed && embedContent) {
      replacement = buildWikilinkEmbedBlock(
        embedContent.title,
        embedContent.slug,
        embedContent.body_html,
        parsed.anchor,
        basePath,
      );
    } else if (embed && targetSlug) {
      const href =
        `${basePath}/${encodeURIComponent(targetSlug)}` +
        (parsed.anchor ? `#${encodeURIComponent(parsed.anchor)}` : "");
      replacement = `<a class="wikilink wikilink--embed wikilink--loading" href="${href}">嵌入：${escapeHtml(display)}</a>`;
    } else if (embed) {
      const cls = "wikilink wikilink--embed wikilink--missing";
      replacement = `<span class="${cls}">未找到嵌入：${escapeHtml(display)}</span>`;
    } else if (targetSlug) {
      const href =
        `${basePath}/${encodeURIComponent(targetSlug)}` +
        (parsed.anchor ? `#${encodeURIComponent(parsed.anchor)}` : "");
      replacement = `[${display}](${href})`;
    } else {
      replacement = `<span class="wikilink wikilink--missing">${escapeHtml(display)}</span>`;
    }
    replacements.push({ start, end, replacement });
  }
  let out = markdown;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i]!;
    out = out.slice(0, start) + replacement + out.slice(end);
  }
  return out;
}

export const OUTBOUND_LINKS_MARKER = "\n\n<!-- outbound-links -->\n";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 正文是否已包含指向该 slug 的 wikilink（含嵌入） */
export function bodyContainsWikilinkToSlug(
  body: string,
  slug: string,
): boolean {
  const esc = escapeRegExp(slug.toLowerCase());
  return (
    new RegExp(`!\\[\\[\\s*${esc}(\\]|\\||#)`, "i").test(body) ||
    new RegExp(`\\[\\[\\s*${esc}(\\]|\\||#)`, "i").test(body)
  );
}

/** 去掉批量导入或保存页误追加的 outbound-links 块 */
export function stripMergedOutboundWikilinkBlock(body: string): string {
  const idx = body.indexOf(OUTBOUND_LINKS_MARKER);
  if (idx === -1) return body;
  return body.slice(0, idx).trimEnd();
}

/** 将表单勾选的双链目标追加到正文末尾（去重），写入 [[slug]] 语法 */
export function mergeWikilinkSlugsIntoBody(
  body: string,
  slugs: string[],
): string {
  const trimmed = body.trimEnd();
  const seen = new Set<string>();
  const toAppend: string[] = [];
  for (const raw of slugs) {
    const slug = raw.trim();
    if (!slug) continue;
    const key = slug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (bodyContainsWikilinkToSlug(trimmed, key)) continue;
    toAppend.push(slug);
  }
  if (!toAppend.length) return trimmed;
  const block =
    OUTBOUND_LINKS_MARKER + toAppend.map((s) => `[[${s}]]`).join("\n");
  return trimmed + block;
}
