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
  paceMultiplier: 1.08,
  fadeMs: 380,
  /** 双链从已显现节点拉向新节点的时长（Obsidian 式） */
  linkPullMs: 340,
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
  const msPerNode = Math.max(58, Math.min(125, 40 + nodeCount * 0.09))
  const stepMs = Math.round(
    msPerNode * stepSize * GRAPH_REVEAL_TIMING.paceMultiplier,
  )
  return { stepSize, stepMs }
}

export interface GraphLinkPullSpec {
  key: string
  anchorId: number
  extendId: number
}

/** 本步新显现的边：锚点为已可见端，extend 为刚加入或同批加入的一端 */
export function newlyVisibleLinkPulls(
  edges: GraphData['edges'],
  visibleBefore: Set<number>,
  visibleAfter: Set<number>,
): GraphLinkPullSpec[] {
  const specs: GraphLinkPullSpec[] = []
  for (const e of edges) {
    if (!visibleAfter.has(e.source) || !visibleAfter.has(e.target)) continue
    if (visibleBefore.has(e.source) && visibleBefore.has(e.target)) continue

    const key = `${e.source}-${e.target}`
    let anchorId: number
    let extendId: number
    if (visibleBefore.has(e.source)) {
      anchorId = e.source
      extendId = e.target
    } else if (visibleBefore.has(e.target)) {
      anchorId = e.target
      extendId = e.source
    } else {
      anchorId = e.source
      extendId = e.target
    }
    specs.push({ key, anchorId, extendId })
  }
  return specs
}

export function easeRevealProgress(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return 1 - (1 - x) ** 3
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
