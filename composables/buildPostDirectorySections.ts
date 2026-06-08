import type { DirectoryRowTree } from '~/composables/buildDirectoryTreeSelect'
import type { PostListItem } from '~/types/post'
import { UNCATEGORIZED_FOLDER_ID } from '~/composables/buildPostExplorerTree'

export type PostDirectorySection = {
  /** 目录 id；未归类为 UNCATEGORIZED_FOLDER_ID */
  id: number
  name: string
  slug: string
  /** 面包屑路径，如「笔记 / 2024」 */
  pathLabel: string
  posts: PostListItem[]
}

function sortPosts(posts: PostListItem[]): PostListItem[] {
  return [...posts].sort((a, b) => {
    const ta = a.updated_at ?? ''
    const tb = b.updated_at ?? ''
    if (ta !== tb) return tb.localeCompare(ta)
    return a.title.localeCompare(b.title, 'zh-CN')
  })
}

/** 按目录分块：每个目录一张表，仅含直接挂在该目录下的文章（无折叠树） */
export function buildPostDirectorySections(
  dirRoots: DirectoryRowTree[],
  posts: PostListItem[],
): PostDirectorySection[] {
  const sections: PostDirectorySection[] = []

  function walk(nodes: DirectoryRowTree[], pathNames: string[]) {
    for (const d of nodes) {
      const pathLabel = [...pathNames, d.name].join(' / ')
      const inDir = sortPosts(posts.filter((p) => p.directory_id === d.id))
      sections.push({
        id: d.id,
        name: d.name,
        slug: d.slug,
        pathLabel,
        posts: inDir,
      })
      if (d.children?.length) walk(d.children, [...pathNames, d.name])
    }
  }

  walk(dirRoots, [])

  const uncategorized = sortPosts(posts.filter((p) => p.directory_id == null))
  if (uncategorized.length) {
    sections.unshift({
      id: UNCATEGORIZED_FOLDER_ID,
      name: '未归类',
      slug: '_uncategorized',
      pathLabel: '未归类',
      posts: uncategorized,
    })
  }

  return sections
}
