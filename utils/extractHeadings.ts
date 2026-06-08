import type { TocHeading } from "~/types/blog";

function slugify(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[*_`~[\]()]/g, "")
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "heading";
}

function uniqueSlug(text: string, used: Set<string>): string {
  let slug = slugify(text);
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  let i = 1;
  while (used.has(`${slug}-${i}`)) i++;
  const next = `${slug}-${i}`;
  used.add(next);
  return next;
}

/** 从 Markdown 源码提取标题大纲（与 marked 渲染的 heading id 规则一致） */
export function extractHeadings(source: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const usedSlugs = new Set<string>();
  const lines = source.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;
    const level = match[1].length;
    const raw = match[2].trim().replace(/\s+#+\s*$/, "");
    const text = raw.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/`/g, "");
    const id = uniqueSlug(text, usedSlugs);
    headings.push({ level, text, id });
  }

  return headings;
}
