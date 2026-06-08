import type { GraphForceSettings } from '~/types/graph'
import { DEFAULT_GRAPH_FORCES } from '~/types/graph'

/**
 * Obsidian 内置图谱 UI 默认值（对照社区 graph.json / obsidian-living-graph 滑块范围）。
 * @see https://github.com/geoffreysflaminglasersword/obsidian-living-graph/blob/main/graphManip.ts
 * @see https://wiki.charleschen.ai/Review/Research/obsidian-graph-visualization-physics-parameters
 */
export const OBSIDIAN_GRAPH_UI_DEFAULTS = {
  centerStrength: 1.1,
  repelStrength: 700,
  linkStrength: 0.5,
  linkDistance: 235,
} as const

/**
 * 松手回弹专用物理（不改变设置面板默认向心力）。
 * 向心仅轻微加强 + 低阻尼 + 慢 alpha 衰减，让节点缓慢漂回中心。
 */
export const GRAPH_SETTLE_PHYSICS = {
  /** 相对默认向心的临时倍率（过大则瞬间吸回、看不清过程） */
  centerBoost: 0.5,
  /** 越低越“滑”，回弹轨迹更长 */
  velocityDecay: 0.18,
  /** 越低模拟越久才冷却 */
  alphaDecay: 0.007,
  /** 维持一段“仍在受力”的阶段 */
  alphaTarget: 0.014,
  reheatAlpha: 0.38,
} as const

/** @deprecated 使用 GRAPH_SETTLE_PHYSICS.centerBoost */
export const GRAPH_SETTLE_CENTER_BOOST = GRAPH_SETTLE_PHYSICS.centerBoost

/** 与 Obsidian 设置面板一致的滑块范围 */
export const OBSIDIAN_GRAPH_UI_RANGES = {
  centerStrength: { min: 0, max: 1, step: 0.01 },
  repelStrength: { min: 0, max: 20, step: 0.5 },
  linkStrength: { min: 0, max: 2, step: 0.05 },
  linkDistance: { min: 30, max: 500, step: 5 },
} as const

/**
 * UI 刻度 → d3-force 实际强度（标定目标：Defaults 下手感接近 Obsidian 全局图谱）。
 * 原先 centerPullScale=0.03125 导致向心力过弱、图谱松散失控。
 */
export const D3_FORCE_CALIBRATION = {
  /** 向心换算倍率（拖放松手后节点需明显被拉回视口中心） */
  centerPullScale: 0.26,
  linkForceScale: 1.05,
  repelForceScale: 2.15,
  /** UI 值即实际斥力（默认配置已用较大 repel，不再额外乘倍） */
  repelUiEffectMultiplier: 1,
  velocityDecay: 0.6,
  alphaDecay: 0.0228,
  alphaMin: 0.001,
  linkIterations: 4,
  collidePadding: 12,
  collideStrength: 0.88,
  /** 斥力有效半径 ≈ 边长倍数，避免长程斥力把簇撕碎 */
  repelDistanceLinkFactor: 2.35,
} as const

export function centerPullFromUi(centerStrength: number): number {
  return Math.max(0, centerStrength) * D3_FORCE_CALIBRATION.centerPullScale
}

export function linkPullFromUi(linkStrength: number): number {
  return Math.max(0, linkStrength) * D3_FORCE_CALIBRATION.linkForceScale
}

export function repelManyBodyFromUi(repelStrength: number): number {
  return (
    -Math.max(0, repelStrength) *
    D3_FORCE_CALIBRATION.repelForceScale *
    D3_FORCE_CALIBRATION.repelUiEffectMultiplier
  )
}

/** Obsidian 250 针对大库；博客规模按节点数缩放到 90–280 */
export function obsidianLinkDistanceForCount(nodeCount: number): number {
  if (nodeCount <= 8) return 95
  if (nodeCount <= 20) return 120
  if (nodeCount <= 45) return 155
  if (nodeCount <= 90) return 195
  if (nodeCount <= 180) return 235
  if (nodeCount <= 350) return 265
  return Math.min(380, Math.round(250 + Math.sqrt(nodeCount - 350) * 6))
}

export function repelDistanceMax(
  width: number,
  height: number,
  nodeCount: number,
  linkDistance: number,
): number {
  const area = width * height
  const perNode = area / Math.max(1, nodeCount)
  const fromArea = Math.sqrt(perNode) * 2.6
  const fromLink = linkDistance * D3_FORCE_CALIBRATION.repelDistanceLinkFactor
  return Math.min(560, Math.max(120, Math.max(fromArea, fromLink)))
}

/**
 * 在 Obsidian 默认 UI 值基础上，仅按规模/密度微调（不大幅削弱向心）。
 */
/** 加载图谱时沿用 DEFAULT，不自动改写用户标定的力度 */
export function resolveGraphForceSettings(
  _nodeCount: number,
  _edgeCount: number,
  base: GraphForceSettings = DEFAULT_GRAPH_FORCES,
): GraphForceSettings {
  return { ...base }
}
