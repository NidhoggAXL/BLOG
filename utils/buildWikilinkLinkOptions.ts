import {
  buildDirectoryRowTree,
  type DirectoryRowTree,
} from '~/composables/buildDirectoryTreeSelect'
import type { WikilinkLinkOption } from '~/composables/useWikilinkTextareaAutocomplete'
import type { DirectoryRow } from '~/types/directory'
import type { PostListItem } from '~/types/post'

/** directory_id → Obsidian 风格路径，如 `01_C语言/01 C语言基础/` */
export function buildDirectoryPathSlashMap(
  flatDirs: DirectoryRow[],
): Map<number | null, string> {
  const tree = buildDirectoryRowTree(flatDirs)
  const map = new Map<number | null, string>()

  function walk(nodes: DirectoryRowTree[], names: string[]) {
    for (const n of nodes) {
      const segs = [...names, n.name]
      map.set(n.id, `${segs.join('/')}/`)
      if (n.children?.length) walk(n.children, segs)
    }
  }

  walk(tree, [])
  map.set(null, '未归类/')
  return map
}

export function directorySlashPathForPost(
  post: PostListItem,
  pathMap: Map<number | null, string>,
): string {
  if (post.directory_id == null) {
    return pathMap.get(null) ?? '未归类/'
  }
  return pathMap.get(post.directory_id) ?? '未知目录/'
}

/** 双链联想候选：大字标题 + 下方目录路径 */
export function buildWikilinkLinkOptions(
  posts: PostListItem[],
  flatDirs: DirectoryRow[],
): WikilinkLinkOption[] {
  const pathMap = buildDirectoryPathSlashMap(flatDirs)
  return posts.map((p) => ({
    value: p.slug,
    label: p.title,
    directoryPath: directorySlashPathForPost(p, pathMap),
  }))
}
