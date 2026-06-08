import type { GraphForceSettings, GraphSimLink, GraphSimNode } from '~/types/graph'
import type { GraphSimulationBundle } from '~/utils/graphSimulation'
import { applyGraphForces, GRAPH_SIM_VELOCITY_DECAY } from '~/utils/graphSimulation'
import { GRAPH_SETTLE_PHYSICS } from '~/utils/obsidianGraphForces'
import {
  type GraphDragCluster,
  type GraphDragMode,
  applyDragClusterPositions,
  buildDragClusterFromNodes,
  neighborIdsOf,
  pinSimNode,
  releaseDragCluster,
  releaseSimNode,
} from '~/utils/graphDrag'

export type GraphDragPointer = { x: number; y: number }

export type GraphDragSession = {
  mode: GraphDragMode
  anchorId: number
  focusIds: Set<number>
  cluster: GraphDragCluster | null
  lastDelta: { dx: number; dy: number }
}

/** 低于此 alpha 才结束回弹阶段（越小 → 动画持续越久） */
export const GRAPH_SETTLE_ALPHA_MIN = 0.0035

export const GRAPH_DRAG_END_REHEAT = {
  alpha: GRAPH_SETTLE_PHYSICS.reheatAlpha,
  alphaTarget: GRAPH_SETTLE_PHYSICS.alphaTarget,
} as const

/** 松手后给节点轻微初速度，朝视口中心缓慢漂移（配合 settling 物理） */
export function injectReturnToCenterVelocity(
  node: GraphSimNode,
  cx: number,
  cy: number,
  boost = 1,
) {
  const x = node.x ?? cx
  const y = node.y ?? cy
  const dx = cx - x
  const dy = cy - y
  const dist = Math.hypot(dx, dy) || 1
  const speed = Math.min(4.2, 0.28 + dist * 0.011) * boost
  node.vx = (dx / dist) * speed
  node.vy = (dy / dist) * speed
}

export function createGraphDragSession(
  anchor: GraphSimNode,
  links: GraphSimLink[],
  nodeById: Map<number, GraphSimNode>,
  pointer: GraphDragPointer,
  shiftCluster: boolean,
): GraphDragSession {
  const mode: GraphDragMode = shiftCluster ? 'cluster' : 'spring'
  const focusIds = neighborIdsOf(anchor.id, links)
  let cluster: GraphDragCluster | null = null

  if (mode === 'cluster') {
    cluster = buildDragClusterFromNodes(anchor, links, nodeById)
    applyDragClusterPositions(cluster, pointer.x, pointer.y, nodeById)
  } else {
    pinSimNode(anchor, pointer.x, pointer.y)
  }

  return {
    mode,
    anchorId: anchor.id,
    focusIds,
    cluster,
    lastDelta: { dx: 0, dy: 0 },
  }
}

export function moveGraphDrag(
  session: GraphDragSession,
  anchor: GraphSimNode,
  pointer: GraphDragPointer,
  nodeById: Map<number, GraphSimNode>,
) {
  const prevX = anchor.x ?? pointer.x
  const prevY = anchor.y ?? pointer.y

  if (session.cluster) {
    applyDragClusterPositions(session.cluster, pointer.x, pointer.y, nodeById)
  } else {
    pinSimNode(anchor, pointer.x, pointer.y)
  }

  session.lastDelta = {
    dx: pointer.x - prevX,
    dy: pointer.y - prevY,
  }
}

/**
 * 开始拖拽：仅钉住被拖节点（或 Shift 簇）；其余节点仍用完整力度模拟。
 */
export function enterGraphDragForces(
  bundle: GraphSimulationBundle,
  settings: GraphForceSettings,
  width: number,
  height: number,
) {
  applyGraphForces(bundle, settings, width, height, 0, {
    dragging: false,
    settling: false,
  })
  bundle.simulation
    .alphaTarget(0.04)
    .alpha(Math.max(bundle.simulation.alpha(), 0.2))
    .restart()
}

/**
 * 结束拖拽：释放钉住 → 向心加强 + 指向中心的初速度 → 模拟回弹。
 */
export function exitGraphDragForces(
  bundle: GraphSimulationBundle,
  settings: GraphForceSettings,
  width: number,
  height: number,
  session: GraphDragSession,
  nodeById: Map<number, GraphSimNode>,
) {
  const cx = width / 2
  const cy = height / 2

  if (session.cluster) {
    for (const id of session.cluster.offsets.keys()) {
      const n = nodeById.get(id)
      if (!n) continue
      releaseSimNode(n)
      if (id === session.anchorId) {
        injectReturnToCenterVelocity(n, cx, cy, 0.92)
      }
    }
  } else {
    const anchor = nodeById.get(session.anchorId)
    if (anchor) {
      releaseSimNode(anchor)
      injectReturnToCenterVelocity(anchor, cx, cy, 0.95)
    }
  }

  applyGraphForces(bundle, settings, width, height, 0, {
    dragging: false,
    settling: true,
  })
  const sim = bundle.simulation
  sim.velocityDecay(GRAPH_SIM_VELOCITY_DECAY)
  sim
    .alphaTarget(GRAPH_DRAG_END_REHEAT.alphaTarget)
    .alpha(Math.max(sim.alpha(), GRAPH_DRAG_END_REHEAT.alpha))
    .restart()
}

export function releaseGraphDragSession(
  session: GraphDragSession,
  nodeById: Map<number, GraphSimNode>,
) {
  if (session.cluster) {
    releaseDragCluster(session.cluster, nodeById)
  } else {
    const anchor = nodeById.get(session.anchorId)
    if (anchor) releaseSimNode(anchor)
  }
}

export function shouldRunGraphSimulationTick(
  alpha: number,
  alphaMin: number,
  options: {
    dragging: boolean
    settling: boolean
    forceTuning: boolean
    /** 播放显现动画：低强度持续模拟，布局丝滑 */
    revealing?: boolean
  },
): boolean {
  if (
    options.dragging ||
    options.settling ||
    options.forceTuning ||
    options.revealing
  ) {
    return true
  }
  return alpha > alphaMin + 1e-4
}

export function isGraphSettling(alpha: number): boolean {
  return alpha > GRAPH_SETTLE_ALPHA_MIN
}
