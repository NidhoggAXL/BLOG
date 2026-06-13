import type { DirectoryRowTree } from "~/composables/buildDirectoryTreeSelect";
import type { DirectoryNavNode } from "~/composables/buildDirectoryNavTree";
import type { DirectoryRow } from "~/types/directory";
import type { PostListItem } from "~/types/post";
import { compareObsidianSortOrder } from "~/utils/sortOrder";

export type LibraryNavNode = DirectoryNavNode & {
  postCount: number;
  directPostCount: number;
};

export function collectDescendantIds(
  rootId: number,
  flat: DirectoryRow[],
): Set<number> {
  const out = new Set<number>([rootId]);
  let frontier = [rootId];
  while (frontier.length) {
    const next: number[] = [];
    for (const row of flat) {
      if (
        row.parent_id != null &&
        frontier.includes(row.parent_id) &&
        !out.has(row.id)
      ) {
        out.add(row.id);
        next.push(row.id);
      }
    }
    frontier = next;
  }
  return out;
}

export function countPostsInSubtree(
  directoryId: number,
  posts: PostListItem[],
  flat: DirectoryRow[],
): number {
  const dirIds = collectDescendantIds(directoryId, flat);
  return posts.filter(
    (p) => p.directory_id != null && dirIds.has(p.directory_id),
  ).length;
}

export function countDirectPosts(
  directoryId: number,
  posts: PostListItem[],
): number {
  return posts.filter((p) => p.directory_id === directoryId).length;
}

function wrapLibraryNodes(
  nodes: DirectoryRowTree[],
  pathNames: string[],
  posts: PostListItem[],
  flat: DirectoryRow[],
): LibraryNavNode[] {
  return nodes.map((d) => {
    const pathLabel = [...pathNames, d.name].join(" / ");
    const directPostCount = countDirectPosts(d.id, posts);
    const postCount = countPostsInSubtree(d.id, posts, flat);
    return {
      id: d.id,
      name: d.name,
      slug: d.slug,
      pathLabel,
      directPostCount,
      postCount,
      children: d.children?.length
        ? wrapLibraryNodes(d.children, [...pathNames, d.name], posts, flat)
        : [],
    };
  });
}

export function buildLibraryNavTree(
  dirRoots: DirectoryRowTree[],
  posts: PostListItem[],
  flat: DirectoryRow[],
): LibraryNavNode[] {
  return wrapLibraryNodes(dirRoots, [], posts, flat);
}

export function filterLibraryNavTree(
  nodes: LibraryNavNode[],
  query: string,
): LibraryNavNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const walk = (list: LibraryNavNode[]): LibraryNavNode[] => {
    const out: LibraryNavNode[] = [];
    for (const n of list) {
      const children = walk(n.children);
      const selfMatch =
        n.name.toLowerCase().includes(q) || n.slug.toLowerCase().includes(q);
      if (selfMatch || children.length) {
        out.push({ ...n, children });
      }
    }
    return out;
  };
  return walk(nodes);
}

export function findLibraryNavNode(
  nodes: LibraryNavNode[],
  id: number,
): LibraryNavNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findLibraryNavNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

export function firstLibraryNavNode(
  nodes: LibraryNavNode[],
): LibraryNavNode | null {
  return nodes[0] ?? null;
}

export function expandLibraryAncestors(
  nodes: LibraryNavNode[],
  targetId: number,
  setExpanded: (id: number, open: boolean) => void,
): boolean {
  for (const n of nodes) {
    if (n.id === targetId) return true;
    if (
      n.children.length &&
      expandLibraryAncestors(n.children, targetId, setExpanded)
    ) {
      setExpanded(n.id, true);
      return true;
    }
  }
  return false;
}

export function getChildDirectories(
  directoryId: number,
  flat: DirectoryRow[],
): DirectoryRow[] {
  return flat
    .filter((r) => r.parent_id === directoryId)
    .sort(
      (a, b) =>
        compareObsidianSortOrder(a.sort_order, b.sort_order) || a.id - b.id,
    );
}

export function statusLabel(status: PostListItem["status"]): string {
  const map: Record<PostListItem["status"], string> = {
    published: "已发布",
    draft: "草稿",
    archived: "已归档",
  };
  return map[status] ?? status;
}
