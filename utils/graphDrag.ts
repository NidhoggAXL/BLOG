import type { GraphForceSettings, GraphSimLink, GraphSimNode } from '~/types/graph'

export type GraphDragMode = 'cluster' | 'spring'

/** 默认拖拽：刚性带动 1 跳邻居 */
export const GRAPH_DRAG_CLUSTER_FORCE_SCALE = {
  linkStrength: 0.22,
  repelStrength: 0.1,
  centerStrength: 0.35,
  collideStrength: 0.25,
  velocityDecay: 0.62,
  alphaTarget: 0.03,
  alphaOnStart: 0.12,
  alphaOnEnd: 0.48,
} as const

/** 默认拖拽：只钉锚点，高亮邻居靠边弹簧弹性跟随 */
export const GRAPH_DRAG_SPRING_FORCE_SCALE = {
  linkStrength: 0.68,
  repelStrength: 0.12,
  centerStrength: 0.38,
  collideStrength: 0.35,
  velocityDecay: 0.55,
  alphaTarget: 0.08,
  alphaOnStart: 0.28,
  alphaOnEnd: 0.55,
} as const

/** @deprecated 使用 GRAPH_DRAG_CLUSTER_FORCE_SCALE */
export const GRAPH_DRAG_FORCE_SCALE = GRAPH_DRAG_CLUSTER_FORCE_SCALE

export type GraphDragCluster = {
  anchorId: number
  /** 锚点与各直接邻居相对锚点的偏移（刚性联动） */
  offsets: Map<number, { dx: number; dy: number }>
}

export function neighborIdsOf(
  nodeId: number,
  links: GraphSimLink[],
): Set<number> {
  const ids = new Set<number>([nodeId])
  for (const l of links) {
    const s = l.source as GraphSimNode
    const t = l.target as GraphSimNode
    if (s.id === nodeId) ids.add(t.id)
    if (t.id === nodeId) ids.add(s.id)
  }
  return ids
}

/** 锚点 + 直接邻居：保持相对位置一起移动 */
export function buildDragClusterFromNodes(
  anchor: GraphSimNode,
  links: GraphSimLink[],
  nodeById: Map<number, GraphSimNode>,
): GraphDragCluster {
  const focus = neighborIdsOf(anchor.id, links)
  const ax = anchor.x ?? 0
  const ay = anchor.y ?? 0
  const offsets = new Map<number, { dx: number; dy: number }>()
  for (const id of focus) {
    const n = id === anchor.id ? anchor : nodeById.get(id)
    if (!n) continue
    offsets.set(id, { dx: (n.x ?? 0) - ax, dy: (n.y ?? 0) - ay })
  }
  return { anchorId: anchor.id, offsets }
}

export function scaledGraphForcesForDrag(
  settings: GraphForceSettings,
  mode: GraphDragMode = 'cluster',
): GraphForceSettings {
  const scale =
    mode === 'spring'
      ? GRAPH_DRAG_SPRING_FORCE_SCALE
      : GRAPH_DRAG_CLUSTER_FORCE_SCALE
  return {
    ...settings,
    linkStrength: settings.linkStrength * scale.linkStrength,
    repelStrength: settings.repelStrength * scale.repelStrength,
    centerStrength: settings.centerStrength * scale.centerStrength,
  }
}

export function dragForceScaleForMode(mode: GraphDragMode) {
  return mode === 'spring'
    ? GRAPH_DRAG_SPRING_FORCE_SCALE
    : GRAPH_DRAG_CLUSTER_FORCE_SCALE
}

export function pinSimNode(d: GraphSimNode, x: number, y: number) {
  d.fx = x
  d.fy = y
  d.x = x
  d.y = y
  d.vx = 0
  d.vy = 0
}

export function releaseSimNode(d: GraphSimNode) {
  d.fx = null
  d.fy = null
}

export function applyDragClusterPositions(
  cluster: GraphDragCluster,
  anchorX: number,
  anchorY: number,
  nodeById: Map<number, GraphSimNode>,
) {
  for (const [id, off] of cluster.offsets) {
    const n = nodeById.get(id)
    if (!n) continue
    pinSimNode(n, anchorX + off.dx, anchorY + off.dy)
  }
}

export function releaseDragCluster(
  cluster: GraphDragCluster,
  nodeById: Map<number, GraphSimNode>,
) {
  for (const id of cluster.offsets.keys()) {
    const n = nodeById.get(id)
    if (n) releaseSimNode(n)
  }
}
