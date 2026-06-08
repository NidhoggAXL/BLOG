import { defineStore } from 'pinia'
import type { DirectoryNavNode } from '~/composables/buildDirectoryNavTree'
import type { DirectoryRowTree } from '~/composables/buildDirectoryTreeSelect'
import type { ExplorerNode } from '~/composables/buildPostExplorerTree'

/**
 * 文章管理页：目录树展开状态（默认全部折叠；离开页面再返回仍保留，直至刷新整站）
 */
export const usePostExplorerUiStore = defineStore('postExplorerUi', () => {
  const expandedById = reactive<Record<number, boolean>>({})

  function isOpen(id: number) {
    return expandedById[id] === true
  }

  function toggle(id: number) {
    if (isOpen(id)) delete expandedById[id]
    else expandedById[id] = true
  }

  function setExpanded(id: number, value: boolean) {
    if (value) expandedById[id] = true
    else delete expandedById[id]
  }

  function walkDirectoryTree(nodes: DirectoryRowTree[], value: boolean) {
    for (const n of nodes) {
      if (n.children?.length) {
        setExpanded(n.id, value)
        walkDirectoryTree(n.children, value)
      }
    }
  }

  function walkExplorerNodes(nodes: ExplorerNode[], value: boolean) {
    for (const n of nodes) {
      if (n.kind === 'dir' && n.children?.length) {
        setExpanded(n.id, value)
        walkExplorerNodes(n.children, value)
      }
    }
  }

  function walkNavNodes(nodes: DirectoryNavNode[], value: boolean) {
    for (const n of nodes) {
      if (n.children.length) {
        setExpanded(n.id, value)
        walkNavNodes(n.children, value)
      }
    }
  }

  return {
    expandedById,
    isOpen,
    toggle,
    setExpanded,
    walkDirectoryTree,
    walkExplorerNodes,
    walkNavNodes,
  }
})
