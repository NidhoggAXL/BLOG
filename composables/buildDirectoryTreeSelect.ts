import type { DirectoryRow } from '~/types/directory'

export type DirectoryTreeNode = { value: number; label: string; children: DirectoryTreeNode[] }

/** Element Plus ElTreeSelect 所需 { value, label, children } */
export function buildDirectoryTreeSelectData(flat: DirectoryRow[]): DirectoryTreeNode[] {
  const map = new Map<number, DirectoryTreeNode>()
  for (const r of flat) {
    map.set(r.id, { value: r.id, label: r.name, children: [] })
  }
  const roots: DirectoryTreeNode[] = []
  for (const r of flat) {
    const node = map.get(r.id)!
    const pid = r.parent_id
    if (pid == null) {
      roots.push(node)
    } else {
      const parent = map.get(pid)
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
  }
  return roots
}

/** 文库树形表格：整行挂在节点上，含 children */
export type DirectoryRowTree = DirectoryRow & { children?: DirectoryRowTree[] }

/** Element Plus el-table 树形：仅根在顶层，子节点在 children；无子级不写 children */
export function buildDirectoryRowTree(flat: DirectoryRow[]): DirectoryRowTree[] {
  const map = new Map<number, DirectoryRowTree>()
  for (const r of flat) {
    map.set(r.id, { ...r, children: [] })
  }
  const roots: DirectoryRowTree[] = []
  for (const r of flat) {
    const node = map.get(r.id)!
    const pid = r.parent_id
    if (pid == null) {
      roots.push(node)
    } else {
      const parent = map.get(pid)
      if (parent) {
        parent.children!.push(node)
      } else {
        roots.push(node)
      }
    }
  }
  const strip = (nodes: DirectoryRowTree[]) => {
    for (const n of nodes) {
      if (n.children?.length === 0) delete n.children
      else if (n.children) strip(n.children)
    }
  }
  strip(roots)
  return roots
}
