import type { GraphData } from '~/types/graph'
import type { GraphSimNode } from '~/types/graph'
import type { GraphSimulationBundle } from '~/utils/graphSimulation'
import { applyGraphForces } from '~/utils/graphSimulation'
import type { GraphForceSettings } from '~/types/graph'
import { graphForceBudget } from '~/utils/obsidianGraphForces'

/** 按连通分量分散初值，避免所有节点从中心一团出发 */
export function findGraphComponents(
  nodeIds: number[],
  edges: GraphData['edges'],
): number[][] {
  const parent = new Map<number, number>()
  for (const id of nodeIds) parent.set(id, id)

  function find(x: number): number {
    let p = parent.get(x)!
    while (p !== parent.get(p)) p = parent.get(p)!
    parent.set(x, p)
    return p
  }

  function unite(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const e of edges) unite(e.source, e.target)

  const buckets = new Map<number, number[]>()
  for (const id of nodeIds) {
    const root = find(id)
    const list = buckets.get(root) ?? []
    list.push(id)
    buckets.set(root, list)
  }

  return [...buckets.values()].sort((a, b) => b.length - a.length)
}

/**
 * 为力模拟赋初值：大连通分量在视口中心展开，小分量绕外围分布（类似 Obsidian 多簇图谱）。
 */
export function assignInitialGraphPositions(
  nodes: GraphSimNode[],
  edges: GraphData['edges'],
  width: number,
  height: number,
): void {
  const cx = width / 2
  const cy = height / 2
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const components = findGraphComponents(
    nodes.map((n) => n.id),
    edges,
  )
  const golden = Math.PI * (3 - Math.sqrt(5))
  const minSide = Math.min(width, height)
  for (let ci = 0; ci < components.length; ci++) {
    const ids = components[ci]!
    const isMain = ci === 0
    const compAngle = (ci / Math.max(1, components.length)) * Math.PI * 2
    const orbit =
      isMain && components.length === 1
        ? 0
        : isMain
          ? minSide * 0.06
          : minSide * (0.22 + (ci / Math.max(1, components.length)) * 0.18)
    const ccx = cx + Math.cos(compAngle) * orbit
    const ccy = cy + Math.sin(compAngle) * orbit
    const spread = isMain
      ? minSide * 0.2 + Math.sqrt(ids.length) * 12
      : minSide * 0.12 + Math.sqrt(ids.length) * 8

    ids.forEach((id, i) => {
      const n = byId.get(id)
      if (!n) return
      const a = i * golden
      const r = 10 + Math.sqrt(i + 1) * (spread / Math.max(6, Math.sqrt(ids.length)))
      n.x = ccx + Math.cos(a) * r
      n.y = ccy + Math.sin(a) * r
      n.vx = 0
      n.vy = 0
    })
  }
}

/** 首屏/重载后预热，得到更稳定的分布（同步版，小图用） */
export function warmupGraphSimulation(
  bundle: GraphSimulationBundle,
  settings: GraphForceSettings,
  width: number,
  height: number,
  nodeCount: number,
): void {
  const { warmupTicks } = graphForceBudget(nodeCount)
  applyGraphForces(bundle, settings, width, height, 0)
  const sim = bundle.simulation
  sim.alpha(1).alphaTarget(0).restart()
  for (let i = 0; i < warmupTicks && sim.alpha() > sim.alphaMin(); i++) {
    sim.tick()
  }
}

/** 分帧预热，避免大图进入时长时间阻塞主线程 */
export function warmupGraphSimulationAsync(
  bundle: GraphSimulationBundle,
  settings: GraphForceSettings,
  width: number,
  height: number,
  nodeCount: number,
  onBatch?: () => void,
): Promise<void> {
  const { warmupTicks, warmupBatch } = graphForceBudget(nodeCount)
  applyGraphForces(bundle, settings, width, height, 0)
  const sim = bundle.simulation
  sim.alpha(1).alphaTarget(0).restart()

  return new Promise((resolve) => {
    let ticked = 0
    const step = () => {
      const end = Math.min(ticked + warmupBatch, warmupTicks)
      for (; ticked < end && sim.alpha() > sim.alphaMin(); ticked++) {
        sim.tick()
      }
      onBatch?.()
      if (ticked < warmupTicks && sim.alpha() > sim.alphaMin()) {
        requestAnimationFrame(step)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(step)
  })
}
