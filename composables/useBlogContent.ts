import type { PublicPostDetail, PublicDirectoryRow, PublicPostMeta } from "~/types/blog";

export function useBlogContent() {
  const posts = useState<PublicPostMeta[]>("blog-posts", () => []);
  const directories = useState<PublicDirectoryRow[]>("blog-directories", () => []);
  const postMap = useState<Record<string, PublicPostDetail>>("blog-post-map", () => ({}));
  const loaded = useState<boolean>("blog-posts-loaded", () => false);
  const directoriesLoaded = useState<boolean>("blog-directories-loaded", () => false);

  function fetchBustQuery() {
    return { _r: Date.now() };
  }

  async function loadPosts(force = false): Promise<PublicPostMeta[]> {
    if (loaded.value && !force) return posts.value;
    const res = await $fetch<{ list: PublicPostMeta[] }>("/api/public/posts", {
      query: force ? fetchBustQuery() : undefined,
      cache: force ? "no-store" : "default",
    });
    posts.value = res.list;
    loaded.value = true;
    prunePostMap();
    return posts.value;
  }

  function prunePostMap() {
    const allowed = new Set(posts.value.map((p) => p.slug));
    for (const key of Object.keys(postMap.value)) {
      if (!allowed.has(key)) {
        delete postMap.value[key];
      }
    }
  }

  function isPublishedSlug(slug: string): boolean {
    const key = slug.trim();
    return posts.value.some((p) => p.slug === key);
  }

  async function loadPostBySlug(slug: string, force = false): Promise<PublicPostDetail | null> {
    const key = slug.trim();
    if (!key) return null;
    if (!force && postMap.value[key]) return postMap.value[key];
    try {
      const detail = await $fetch<PublicPostDetail>(
        `/api/public/posts/${encodeURIComponent(key)}`,
        {
          query: force ? fetchBustQuery() : undefined,
          cache: force ? "no-store" : "default",
        },
      );
      postMap.value[key] = detail;
      return detail;
    } catch {
      return null;
    }
  }

  async function loadDirectories(force = false): Promise<PublicDirectoryRow[]> {
    if (directoriesLoaded.value && !force) return directories.value;
    const res = await $fetch<{ list: PublicDirectoryRow[] }>(
      "/api/public/directories/tree",
      {
        query: force ? fetchBustQuery() : undefined,
        cache: force ? "no-store" : "default",
      },
    );
    directories.value = res.list;
    directoriesLoaded.value = true;
    return directories.value;
  }

  async function refreshAll(): Promise<void> {
    postMap.value = {};
    loaded.value = false;
    directoriesLoaded.value = false;
    await Promise.all([loadPosts(true), loadDirectories(true)]);
  }

  function getPostBySlug(slug: string): PublicPostDetail | null {
    return postMap.value[slug] ?? null;
  }

  function getAllSlugs(): string[] {
    return posts.value.map((item) => item.slug);
  }

  return {
    posts,
    directories,
    loadPosts,
    loadDirectories,
    refreshAll,
    loadPostBySlug,
    getPostBySlug,
    getAllSlugs,
    isPublishedSlug,
    prunePostMap,
  };
}
