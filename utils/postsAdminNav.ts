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

/** 侧栏「全部文章」虚拟节点 */
export const ALL_POSTS_NAV_ID = -2;

export type PostsAdminNavNode = LibraryNavNode & {
  kind?: "all" | "uncategorized" | "folder";
};

export function buildPostsAdminNavTree(
  flat: DirectoryRow[],
  posts: PostListItem[],
): PostsAdminNavNode[] {
  const dirRoots = buildDirectoryRowTree(flat);
  const dirNodes = buildLibraryNavTree(dirRoots, posts, flat);

  const roots: PostsAdminNavNode[] = [
    {
      id: ALL_POSTS_NAV_ID,
      name: "全部",
      slug: "_all",
      pathLabel: "全部",
      postCount: posts.length,
      directPostCount: posts.length,
      children: [],
      kind: "all",
    },
  ];

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

  const virtual = nodes.filter(
    (n) => n.kind === "all" || n.kind === "uncategorized",
  );
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

export function isRealDirectoryNavId(id: number | null): id is number {
  return id != null && id > 0;
}

export function postsForNavSelection(
  navId: number | null,
  posts: PostListItem[],
  flat: DirectoryRow[],
): PostListItem[] {
  if (navId == null) return [];
  if (navId === ALL_POSTS_NAV_ID) return posts;
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
  if (navId === ALL_POSTS_NAV_ID) return posts.length;
  if (navId === UNCATEGORIZED_FOLDER_ID) {
    return posts.filter((p) => p.directory_id == null).length;
  }
  return countPostsInSubtree(navId, posts, flat);
}
