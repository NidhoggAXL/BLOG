import type { DirectoryRowTree } from '~/composables/buildDirectoryTreeSelect'
import type { PostListItem } from '~/types/post'
import { compareObsidianSortOrder } from '~/utils/sortOrder'

const UNCATEGORIZED_FOLDER_ID = -1

export type ExplorerNode =
  | {
      kind: 'dir'
      id: number
      name: string
      slug: string
      children: ExplorerNode[]
    }
  | {
      kind: 'post'
      id: number
      slug: string
      title: string
      status: PostListItem['status']
    }

/** 目录树 + 文章列表 → 资源管理器式节点（目录下挂 .md 文章） */
export function buildPostExplorerTree(
  dirRoots: DirectoryRowTree[],
  posts: PostListItem[],
): ExplorerNode[] {
  const byDir = new Map<number, ExplorerNode[]>()
  const uncategorized: ExplorerNode[] = []

  for (const p of posts) {
    const leaf: ExplorerNode = {
      kind: 'post',
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
    }
    if (p.directory_id == null) {
      uncategorized.push(leaf)
    } else {
      if (!byDir.has(p.directory_id)) byDir.set(p.directory_id, [])
      byDir.get(p.directory_id)!.push(leaf)
    }
  }

  const postById = new Map(posts.map((p) => [p.id, p]))
  const sortPostNodes = (nodes: ExplorerNode[]) => {
    nodes.sort((a, b) => {
      if (a.kind !== 'post' || b.kind !== 'post') return 0
      const pa = postById.get(a.id)!
      const pb = postById.get(b.id)!
      const order = compareObsidianSortOrder(pa.sort_order, pb.sort_order)
      if (order !== 0) return order
      return pa.title.localeCompare(pb.title, 'zh-CN')
    })
  }
  sortPostNodes(uncategorized)
  for (const files of byDir.values()) sortPostNodes(files)

  function wrapDir(d: DirectoryRowTree): ExplorerNode {
    const dirChildren = (d.children ?? []).map(wrapDir)
    const files = byDir.get(d.id) ?? []
    return {
      kind: 'dir',
      id: d.id,
      name: d.name,
      slug: d.slug,
      children: [...dirChildren, ...files],
    }
  }

  const roots = dirRoots.map(wrapDir)
  if (uncategorized.length) {
    roots.unshift({
      kind: 'dir',
      id: UNCATEGORIZED_FOLDER_ID,
      name: '未归类',
      slug: '_uncategorized',
      children: uncategorized,
    })
  }
  return roots
}

export { UNCATEGORIZED_FOLDER_ID }
