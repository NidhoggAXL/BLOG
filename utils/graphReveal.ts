import type {
  GraphData,
  GraphNode,
  GraphNodePose,
  GraphSimNode,
} from '~/types/graph'

function createdAtMs(node: GraphNode): number {
  const t = Date.parse(node.created_at)
  return Number.isFinite(t) ? t : node.id
}

/** 播放动画：按笔记 created_at 从早到晚依次显现（与是否有双链无关） */
export function buildGraphRevealOrder(data: GraphData): number[] {
  return [...data.nodes]
    .sort((a, b) => createdAtMs(a) - createdAtMs(b) || a.id - b.id)
    .map((n) => n.id)
}

export function filterEdgesForVisibleNodes(
  edges: GraphData['edges'],
  visibleIds: Set<number>,
) {
  return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
}

/** 播放动画节奏与物理参数（paceMultiplier 越大步进间隔越长） */
export const GRAPH_REVEAL_TIMING = {
  paceMultiplier: 3.5,
  fadeMs: 1000,
  stepReheat: 0.028,
  startReheat: 0.06,
  alphaTarget: 0.022,
} as const

/** 按节点规模自适应步进；总时长随节点数伸缩 */
export function getGraphRevealPacing(nodeCount: number) {
  const stepSize =
    nodeCount <= 50
      ? 1
      : nodeCount <= 150
        ? 2
        : Math.max(2, Math.ceil(nodeCount / 55))
  const msPerNode = Math.max(180, Math.min(320, 160 + nodeCount * 0.22))
  const stepMs = Math.round(
    msPerNode * stepSize * GRAPH_REVEAL_TIMING.paceMultiplier,
  )
  return { stepSize, stepMs }
}

/**
 * 显现动画：保留已有节点坐标，新节点落在邻居附近，避免每步全图重新布局导致闪烁。
 */
export function anchorRevealNodes(
  nodes: GraphSimNode[],
  edges: GraphData['edges'],
  previous: Map<number, GraphSimNode>,
  width: number,
  height: number,
  layoutCache?: Map<number, GraphNodePose>,
): void {
  const cx = width / 2
  const cy = height / 2

  for (const n of nodes) {
    const prev = previous.get(n.id)
    if (prev) {
      n.x = prev.x ?? cx
      n.y = prev.y ?? cy
      n.vx = (prev.vx ?? 0) * 0.22
      n.vy = (prev.vy ?? 0) * 0.22
      continue
    }

    const cached = layoutCache?.get(n.id)
    if (cached) {
      n.x = cached.x
      n.y = cached.y
      n.vx = 0
      n.vy = 0
      continue
    }

    const neighborIds: number[] = []
    for (const e of edges) {
      if (e.source === n.id) neighborIds.push(e.target)
      else if (e.target === n.id) neighborIds.push(e.source)
    }

    let placed = false
    for (const nid of neighborIds) {
      const nb = previous.get(nid)
      if (nb?.x == null || nb?.y == null) continue
      const angle = Math.random() * Math.PI * 2
      const dist = 34 + Math.random() * 16
      n.x = nb.x + Math.cos(angle) * dist
      n.y = nb.y + Math.sin(angle) * dist
      n.vx = 0
      n.vy = 0
      placed = true
      break
    }

    if (!placed) {
      const angle = Math.random() * Math.PI * 2
      const dist = 72 + Math.random() * 48
      n.x = cx + Math.cos(angle) * dist
      n.y = cy + Math.sin(angle) * dist
      n.vx = 0
      n.vy = 0
    }
  }
}
