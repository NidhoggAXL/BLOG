import type { GraphForceSettings } from '~/types/graph'
import { resolveGraphForceSettings } from '~/utils/obsidianGraphForces'

/** @deprecated 使用 resolveGraphForceSettings */
export function adaptiveGraphForces(
  nodeCount: number,
  edgeCount: number,
  base?: GraphForceSettings,
): GraphForceSettings {
  return resolveGraphForceSettings(nodeCount, edgeCount, base)
}
