/** 归档 zip 路径 → 路径型 slug（如 aaaa/bbb.md → aaaa/bbb） */

export function normalizeArchivePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

export function fileStemFromArchivePath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.(md|markdown|mdown|mkd)$/i, "").trim();
}

export function buildPathSlugFromArchivePath(
  path: string,
  archiveDepth = 0,
): string {
  const normalized = normalizeArchivePath(path);
  const segs = normalized.split("/").filter(Boolean);
  if (!segs.length) return "未命名";
  const depth = Math.max(0, Math.floor(archiveDepth));
  const dirSegs = segs.length > 1 ? segs.slice(depth, -1) : [];
  const stem = fileStemFromArchivePath(normalized);
  const parts = [...dirSegs, stem].filter(Boolean);
  const slug = parts.join("/").slice(0, 191);
  return slug || "未命名";
}

export function splitPathSlug(slug: string): string[] {
  return slug.split("/").filter(Boolean);
}

export function pathSlugStem(slug: string): string {
  const parts = splitPathSlug(slug);
  return parts[parts.length - 1] ?? slug.trim();
}

export function isPathSlug(slug: string): boolean {
  return slug.includes("/");
}

/** 前台 /blog/aaaa/bbb */
export function pathSlugToPublicHref(basePath: string, slug: string): string {
  const base = basePath.replace(/\/$/, "");
  const encoded = splitPathSlug(slug).map(encodeURIComponent).join("/");
  return encoded ? `${base}/${encoded}` : base;
}

/** 双链 / 后台：单段 encode，兼容 admin [slug] 路由 */
export function pathSlugToEncodedHref(basePath: string, slug: string): string {
  const base = basePath.replace(/\/$/, "");
  return `${base}/${encodeURIComponent(slug)}`;
}

/** 根据 basePath 选择前台路径或 encode 单段 */
export function wikilinkHref(basePath: string, slug: string): string {
  const base = basePath.replace(/\/$/, "");
  if (base === "/blog" || base.endsWith("/blog")) {
    return pathSlugToPublicHref(base, slug);
  }
  return pathSlugToEncodedHref(base, slug);
}

export function publicBlogPostPath(slug: string): string {
  return pathSlugToPublicHref("/blog", slug);
}

export function adminPostPath(slug: string): string {
  return pathSlugToEncodedHref("/admin/posts", slug);
}
