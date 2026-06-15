/**
 * 阅读/预览时将 GitHub raw 图床 URL 改写为 jsDelivr，不修改数据库中的 Markdown。
 * 仅适用于公开仓库。
 *
 * raw: https://raw.githubusercontent.com/user/repo/branch/path/img.png
 * cdn: https://cdn.jsdelivr.net/gh/user/repo@branch/path/img.png
 */
export function githubRawToJsDelivr(href: string): string {
  const raw = href?.trim();
  if (!raw) return href;

  try {
    const u = new URL(raw);
    if (u.hostname.toLowerCase() !== "raw.githubusercontent.com") return href;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return href;

    const [user, repo, ...rest] = parts;
    let branch: string;
    let filePath: string;

    if (rest[0] === "refs" && rest[1] === "heads" && rest.length >= 4) {
      branch = rest[2]!;
      filePath = rest.slice(3).join("/");
    } else {
      branch = rest[0]!;
      filePath = rest.slice(1).join("/");
    }

    if (!user || !repo || !branch || !filePath) return href;

    const encodedPath = filePath
      .split("/")
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join("/");

    return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${encodedPath}`;
  } catch {
    return href;
  }
}
