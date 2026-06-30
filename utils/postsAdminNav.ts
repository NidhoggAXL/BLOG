import { buildDirectoryRowTree } from "~/composables/buildDirectoryTreeSelect";
import { UNCATEGORIZED_FOLDER_ID } from "~/composables/buildPostExplorerTree";
import type { DirectoryRow } from "~/types/directory";
import type { PostListItem } from "~/types/post";
import {
  buildLibraryNavTree,
  collectDescendantIds,
  countPostsInSubtree,
  filterLibraryNavTree,
  findLibraryNavNode,
  firstLibraryNavNode,
  type LibraryNavNode,
} from "~/utils/libraryDirectory";

export type PostsAdminNavNode = LibraryNavNode & {
  kind?: "uncategorized" | "folder";
};

export function buildPostsAdminNavTree(
  flat: DirectoryRow[],
  posts: PostListItem[],
): PostsAdminNavNode[] {
  const dirRoots = buildDirectoryRowTree(flat);
  const dirNodes = buildLibraryNavTree(dirRoots, posts, flat);

  const roots: PostsAdminNavNode[] = [];

  if (posts.some((p) => p.directory_id == null)) {
    const uncategorizedCount = posts.filter((p) => p.directory_id == null).length;
    roots.push({
      id: UNCATEGORIZED_FOLDER_ID,
      name: "未归类",
      slug: "_uncategorized",
      pathLabel: "未归类",
      postCount: uncategorizedCount,
      directPostCount: uncategorizedCount,
      children: [],
      kind: "uncategorized",
    });
  }

  return [...roots, ...dirNodes.map((n) => ({ ...n, kind: "folder" as const }))];
}

export function filterPostsAdminNavTree(
  nodes: PostsAdminNavNode[],
  query: string,
): PostsAdminNavNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const virtual = nodes.filter((n) => n.kind === "uncategorized");
  const folders = nodes.filter((n) => n.kind === "folder");
  const filteredFolders = filterLibraryNavTree(
    folders as LibraryNavNode[],
    query,
  ) as PostsAdminNavNode[];

  const virtualOut = virtual.filter((n) => {
    const label = n.name.toLowerCase();
    return label.includes(q) || q.includes(label.slice(0, 2));
  });

  return [...virtualOut, ...filteredFolders];
}

export function findPostsAdminNavNode(
  nodes: PostsAdminNavNode[],
  id: number,
): PostsAdminNavNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findPostsAdminNavNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

export function firstPostsAdminNavNode(
  nodes: PostsAdminNavNode[],
): PostsAdminNavNode | null {
  return nodes[0] ?? null;
}

export function postsForNavSelection(
  navId: number | null,
  posts: PostListItem[],
  flat: DirectoryRow[],
): PostListItem[] {
  if (navId == null) return [];
  if (navId === UNCATEGORIZED_FOLDER_ID) {
    return posts.filter((p) => p.directory_id == null);
  }
  const dirIds = collectDescendantIds(navId, flat);
  return posts.filter(
    (p) => p.directory_id != null && dirIds.has(p.directory_id),
  );
}

export function subtreeCountForNav(
  navId: number | null,
  posts: PostListItem[],
  flat: DirectoryRow[],
): number {
  if (navId == null) return 0;
  if (navId === UNCATEGORIZED_FOLDER_ID) {
    return posts.filter((p) => p.directory_id == null).length;
  }
  return countPostsInSubtree(navId, posts, flat);
}
