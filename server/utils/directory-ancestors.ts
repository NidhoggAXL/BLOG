import type { Pool } from 'mysql2/promise'

/** 含自身在内的所有后代 id（逐层 BFS） */
export async function getDescendantIdsIncludingSelf(pool: Pool, rootId: number): Promise<Set<number>> {
  const out = new Set<number>([rootId])
  let frontier: number[] = [rootId]
  while (frontier.length) {
    const placeholders = frontier.map(() => '?').join(',')
    const [rows] = await pool.query(
      `SELECT id FROM directories WHERE parent_id IN (${placeholders})`,
      frontier,
    )
    const next: number[] = []
    for (const r of rows as { id: number }[]) {
      if (!out.has(r.id)) {
        out.add(r.id)
        next.push(r.id)
      }
    }
    frontier = next
  }
  return out
}
