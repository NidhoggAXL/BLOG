import type { TreeNode } from "~/types/blog";
import type { PublicDirectoryRow } from "~/types/blog";
import type { PublicPostMeta } from "~/types/blog";

type MutableFolderNode = {
  id: string;
  name: string;
  sort_order: number;
  sort_time: number;
  type: "folder";
  children: TreeNode[];
};

function treeNodeLabel(raw: string, fallback = "未命名"): string {
  const s = raw.trim();
  return s || fallback;
}

function fileNameWithoutExt(slug: string): string {
  const segments = slug.split("/").filter(Boolean);
  const base = segments[segments.length - 1] || slug;
  return base.replace(/\.(md|markdown)$/i, "");
}

function toTimeMs(raw?: string | null): number {
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function buildFileTreeByDirectories(
  directories: PublicDirectoryRow[],
  posts: PublicPostMeta[],
): TreeNode[] {
  const roots: TreeNode[] = [];
  const folderByRawId = new Map<number, MutableFolderNode>();
  const parentByRawId = new Map<number, number | null>();

  for (const d of directories) {
    parentByRawId.set(d.id, d.parent_id);
    folderByRawId.set(d.id, {
      id: `dir:${d.id}`,
      name: treeNodeLabel(d.name),
      sort_order: d.sort_order,
      sort_time: 0,
      type: "folder",
      children: [],
    });
  }

  for (const d of directories) {
    const node = folderByRawId.get(d.id)!;
    if (d.parent_id == null) {
      roots.push(node);
      continue;
    }
    const parent = folderByRawId.get(d.parent_id);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  for (const post of posts) {
    const fileTime = toTimeMs(post.date);
    const fileNode: TreeNode = {
      id: `file:${post.slug}`,
      name: treeNodeLabel(post.title || fileNameWithoutExt(post.slug)),
      type: "file",
      sort_time: fileTime,
      slug: post.slug,
    };
    if (post.directory_id != null) {
      const folder = folderByRawId.get(post.directory_id);
      if (folder) {
        folder.children.push(fileNode);
        let current: number | null = post.directory_id;
        const seen = new Set<number>();
        while (current != null && !seen.has(current)) {
          seen.add(current);
          const node = folderByRawId.get(current);
          if (!node) break;
          if (fileTime > node.sort_time) node.sort_time = fileTime;
          current = parentByRawId.get(current) ?? null;
        }
        continue;
      }
    }
    roots.push(fileNode);
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      if (a.type === "folder" && b.type === "folder") {
        const aSort = a.sort_order ?? 0;
        const bSort = b.sort_order ?? 0;
        if (aSort !== bSort) return aSort - bSort;
        const aTime = a.sort_time ?? 0;
        const bTime = b.sort_time ?? 0;
        if (aTime !== bTime) return aTime - bTime;
      } else {
        const aTime = a.sort_time ?? 0;
        const bTime = b.sort_time ?? 0;
        if (aTime !== bTime) return aTime - bTime;
      }
      return a.name.localeCompare(b.name, "zh-CN");
    });
    for (const node of nodes) {
      if (node.type === "folder" && node.children) {
        sortNodes(node.children);
      }
    }
  };
  sortNodes(roots);
  return roots;
}

function findFolderPathToSlug(
  nodes: TreeNode[],
  slug: string,
  trail: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.type === "file" && node.slug === slug) {
      return trail;
    }
    if (node.type === "folder" && node.children) {
      const found = findFolderPathToSlug(node.children, slug, [...trail, node.id]);
      if (found) return found;
    }
  }
  return null;
}

function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === "folder" && node.children?.length) {
      const hit = findNodeById(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function folderHasSubfolders(node: TreeNode): boolean {
  return !!node.children?.length;
}

function collectExpandableFolderIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    if (n.type !== "folder") continue;
    if (folderHasSubfolders(n)) ids.push(n.id);
    if (n.children?.length) ids.push(...collectExpandableFolderIds(n.children));
  }
  return ids;
}

export function useSiteMenu() {
  const { posts, directories } = useBlogContent();
  const fileTree = computed(() =>
    buildFileTreeByDirectories(directories.value, posts.value),
  );
  const pathIds = useState<string[]>("menu-path-ids", () => []);
  const expandedIds = useState<string[]>("menu-level-expanded-ids", () => []);

  const currentNodes = computed(() => fileTree.value);
  const breadcrumbs = computed(() => [{ id: null, name: "根目录" }]);
  const canInlineExpand = computed(() => true);
  const canExpandCollapse = computed(
    () => collectExpandableFolderIds(currentNodes.value).length > 0,
  );
  const expandedSet = computed(() => new Set(expandedIds.value));

  function saveExpanded(set: Set<string>) {
    expandedIds.value = [...set];
  }

  function enterFolder(id: string) {
    const node = findNodeById(fileTree.value, id);
    if (!node || node.type !== "folder" || !folderHasSubfolders(node)) return;
    toggleExpand(id);
  }

  function goToBreadcrumb(_index: number) {}

  function goBack() {}

  function syncPathForSlug(slug: string) {
    const folderPath = findFolderPathToSlug(fileTree.value, slug);
    if (folderPath) {
      const next = new Set(expandedIds.value);
      for (const id of folderPath) next.add(id);
      saveExpanded(next);
    }
  }

  function toggleExpand(id: string) {
    const next = new Set(expandedSet.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveExpanded(next);
  }

  function expandAll() {
    saveExpanded(new Set(collectExpandableFolderIds(currentNodes.value)));
  }

  function collapseAll() {
    saveExpanded(new Set());
  }

  function isExpanded(id: string) {
    return expandedSet.value.has(id);
  }

  return {
    fileTree,
    pathIds,
    currentNodes,
    breadcrumbs,
    canInlineExpand,
    canExpandCollapse,
    enterFolder,
    goToBreadcrumb,
    goBack,
    syncPathForSlug,
    toggleExpand,
    expandAll,
    collapseAll,
    isExpanded,
    folderHasSubfolders,
  };
}
