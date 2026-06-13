import { buildDirectoryRowTree } from "~/composables/buildDirectoryTreeSelect";
import type { DirectoryRow } from "~/types/directory";
import type { PostListItem } from "~/types/post";
import {
  buildLibraryNavTree,
  filterLibraryNavTree,
  type LibraryNavNode,
} from "~/utils/libraryDirectory";

/** 目录结构页侧栏「全部」虚拟节点 */
export const ALL_DIRECTORIES_NAV_ID = -2;

export type DirectoriesAdminNavNode = LibraryNavNode & {
  kind?: "all" | "folder";
  directoryCount?: number;
};

export function buildDirectoriesAdminNavTree(
  flat: DirectoryRow[],
  posts: PostListItem[],
): DirectoriesAdminNavNode[] {
  const dirRoots = buildDirectoryRowTree(flat);
  const dirNodes = buildLibraryNavTree(dirRoots, posts, flat);

  const roots: DirectoriesAdminNavNode[] = [
    {
      id: ALL_DIRECTORIES_NAV_ID,
      name: "全部",
      slug: "_all",
      pathLabel: "全部",
      postCount: posts.filter((p) => p.directory_id != null).length,
      directPostCount: posts.filter((p) => p.directory_id != null).length,
      directoryCount: flat.length,
      children: [],
      kind: "all",
    },
  ];

  return [...roots, ...dirNodes.map((n) => ({ ...n, kind: "folder" as const }))];
}

export function filterDirectoriesAdminNavTree(
  nodes: DirectoriesAdminNavNode[],
  query: string,
): DirectoriesAdminNavNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const virtual = nodes.filter((n) => n.kind === "all");
  const folders = nodes.filter((n) => n.kind === "folder");
  const filteredFolders = filterLibraryNavTree(
    folders as LibraryNavNode[],
    query,
  ) as DirectoriesAdminNavNode[];

  const virtualOut = virtual.filter((n) => {
    const label = n.name.toLowerCase();
    return label.includes(q) || q.includes(label.slice(0, 2));
  });

  return [...virtualOut, ...filteredFolders];
}

export function findDirectoriesAdminNavNode(
  nodes: DirectoriesAdminNavNode[],
  id: number,
): DirectoriesAdminNavNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findDirectoriesAdminNavNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

export function firstDirectoriesAdminNavNode(
  nodes: DirectoriesAdminNavNode[],
): DirectoriesAdminNavNode | null {
  return nodes[0] ?? null;
}

export function isRealDirectoryNavId(id: number | null): id is number {
  return id != null && id > 0;
}
