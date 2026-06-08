import type { DirectoryRowTree } from '~/composables/buildDirectoryTreeSelect'
import type { DirectoryNavNode } from '~/composables/buildDirectoryNavTree'
import { UNCATEGORIZED_FOLDER_ID } from '~/composables/buildPostExplorerTree'
import type { PostListItem } from '~/types/post'

const STATUS_LABELS: Record<PostListItem['status'], string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
}

export type PostListRow = PostListItem & {
  directory_path?: string
}

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isSearchActive(query: string): boolean {
  return normalizeSearchQuery(query).length > 0
}

/** 匹配标题、slug、状态中文 */
export function postMatchesQuery(post: PostListItem, query: string): boolean {
  const needle = normalizeSearchQuery(query)
  if (!needle) return true
  const statusLabel = STATUS_LABELS[post.status] ?? post.status
  return (
    post.title.toLowerCase().includes(needle) ||
    post.slug.toLowerCase().includes(needle) ||
    statusLabel.includes(needle) ||
    post.status.includes(needle)
  )
}

export function filterPostsByQuery(posts: PostListItem[], query: string): PostListItem[] {
  if (!isSearchActive(query)) return posts
  return posts.filter((p) => postMatchesQuery(p, query))
}

export type PostStatusFilter = 'all' | PostListItem['status']

export function filterPostsByStatus(
  posts: PostListItem[],
  status: PostStatusFilter,
): PostListItem[] {
  if (status === 'all') return posts
  return posts.filter((p) => p.status === status)
}

/** directory_id → 面包屑路径 */
export function buildDirectoryPathLabelMap(tree: DirectoryRowTree[]): Map<number | null, string> {
  const map = new Map<number | null, string>()

  function walk(nodes: DirectoryRowTree[], pathNames: string[]) {
    for (const n of nodes) {
      const pathLabel = [...pathNames, n.name].join(' / ')
      map.set(n.id, pathLabel)
      if (n.children?.length) walk(n.children, [...pathNames, n.name])
    }
  }

  walk(tree, [])
  map.set(null, '未归类')
  return map
}

export function directoryPathForPost(
  post: PostListItem,
  pathMap: Map<number | null, string>,
): string {
  if (post.directory_id == null) {
    return pathMap.get(null) ?? '未归类'
  }
  return pathMap.get(post.directory_id) ?? '未知目录'
}

export function attachDirectoryPaths(
  posts: PostListItem[],
  pathMap: Map<number | null, string>,
): PostListRow[] {
  return posts.map((p) => ({
    ...p,
    directory_path: directoryPathForPost(p, pathMap),
  }))
}

/** 统计各目录下命中篇数（含未归类） */
export function matchCountByDirectory(posts: PostListItem[], query: string): Map<number, number> {
  const map = new Map<number, number>()
  if (!isSearchActive(query)) return map

  for (const p of filterPostsByQuery(posts, query)) {
    const key = p.directory_id ?? UNCATEGORIZED_FOLDER_ID
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

/** 仅保留有命中文章（或子目录有命中）的目录节点 */
export function filterNavTreeForSearch(
  nodes: DirectoryNavNode[],
  counts: Map<number, number>,
): DirectoryNavNode[] {
  function walk(list: DirectoryNavNode[]): DirectoryNavNode[] {
    const out: DirectoryNavNode[] = []
    for (const n of list) {
      const children = walk(n.children)
      const hits = counts.get(n.id) ?? 0
      if (hits > 0 || children.length) {
        out.push({ ...n, children })
      }
    }
    return out
  }
  return walk(nodes)
}

/** 收集树上所有节点 id（用于搜索时全部展开） */
export function collectNavNodeIds(nodes: DirectoryNavNode[]): number[] {
  const ids: number[] = []
  function walk(list: DirectoryNavNode[]) {
    for (const n of list) {
      ids.push(n.id)
      if (n.children.length) walk(n.children)
    }
  }
  walk(nodes)
  return ids
}
