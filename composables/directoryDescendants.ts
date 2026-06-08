import type { DirectoryRow } from '~/types/directory'

/** 客户端根据扁平列表计算：含 rootId 自身在内的所有后代 id */
export function collectDescendantIdsIncludingSelfClient(flat: DirectoryRow[], rootId: number): Set<number> {
  const out = new Set<number>([rootId])
  let frontier: number[] = [rootId]
  while (frontier.length) {
    const next: number[] = []
    for (const pid of frontier) {
      for (const r of flat) {
        if (r.parent_id === pid && !out.has(r.id)) {
          out.add(r.id)
          next.push(r.id)
        }
      }
    }
    frontier = next
  }
  return out
}
