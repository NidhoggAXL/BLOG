import { defineStore } from 'pinia'
import type { GraphNodePose, GraphSimNode } from '~/types/graph'

/**
 * 关系图谱节点布局缓存。
 * 离开图谱页再返回、或切换「显示孤立文件」时，可从缓存恢复坐标。
 * 刷新图谱数据时请调用 clear()。
 */
export const useGraphLayoutStore = defineStore('graphLayout', () => {
  const positions = reactive(new Map<number, GraphNodePose>())

  function snapshotNodes(
    nodes: Iterable<Pick<GraphSimNode, 'id' | 'x' | 'y' | 'vx' | 'vy'>>,
  ) {
    for (const n of nodes) {
      if (n.x != null && n.y != null && Number.isFinite(n.x) && Number.isFinite(n.y)) {
        positions.set(n.id, {
          x: n.x,
          y: n.y,
          vx: n.vx ?? 0,
          vy: n.vy ?? 0,
        })
      }
    }
  }

  function prevPosMap() {
    return new Map(positions)
  }

  function has(id: number) {
    return positions.has(id)
  }

  function clear() {
    positions.clear()
  }

  return {
    positions,
    snapshotNodes,
    prevPosMap,
    has,
    clear,
  }
})
