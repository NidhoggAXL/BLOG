import type { DirectoryRowTree } from '~/composables/buildDirectoryTreeSelect'
import { UNCATEGORIZED_FOLDER_ID } from '~/composables/buildPostExplorerTree'
import type { PostListItem } from '~/types/post'

export type DirectoryNavNode = {
  id: number
  name: string
  slug: string
  pathLabel: string
  children: DirectoryNavNode[]
}

function wrapNodes(nodes: DirectoryRowTree[], pathNames: string[]): DirectoryNavNode[] {
  return nodes.map((d) => {
    const pathLabel = [...pathNames, d.name].join(' / ')
    return {
      id: d.id,
      name: d.name,
      slug: d.slug,
      pathLabel,
      children: d.children?.length ? wrapNodes(d.children, [...pathNames, d.name]) : [],
    }
  })
}

/** 仅目录层级，用于左侧导航（不含文章叶子） */
export function buildDirectoryNavTree(
  dirRoots: DirectoryRowTree[],
  posts: PostListItem[],
): DirectoryNavNode[] {
  const roots = wrapNodes(dirRoots, [])
  const hasUncategorized = posts.some((p) => p.directory_id == null)
  if (hasUncategorized) {
    roots.unshift({
      id: UNCATEGORIZED_FOLDER_ID,
      name: '未归类',
      slug: '_uncategorized',
      pathLabel: '未归类',
      children: [],
    })
  }
  return roots
}

export function findDirectoryNavNode(
  nodes: DirectoryNavNode[],
  id: number,
): DirectoryNavNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const hit = findDirectoryNavNode(n.children, id)
    if (hit) return hit
  }
  return null
}

/** 深度优先取第一个目录节点 */
export function firstDirectoryNavNode(nodes: DirectoryNavNode[]): DirectoryNavNode | null {
  if (!nodes.length) return null
  return nodes[0]!
}

/** 展开到目标目录的所有祖先，便于折叠状态下仍能看到选中项 */
export function expandNavAncestors(
  nodes: DirectoryNavNode[],
  targetId: number,
  setExpanded: (id: number, open: boolean) => void,
): boolean {
  for (const n of nodes) {
    if (n.id === targetId) return true
    if (n.children.length && expandNavAncestors(n.children, targetId, setExpanded)) {
      setExpanded(n.id, true)
      return true
    }
  }
  return false
}
