import type {
  DashboardData,
  DashboardPostTrendPoint,
  DashboardRecentPost,
  DashboardTopLink,
  WikilinkResolveStatus,
} from '../../types/dashboard'

const RESOLVE_STATUSES: WikilinkResolveStatus[] = [
  'ok',
  'missing_target',
  'ambiguous',
  'self_loop',
]

const TREND_DAYS = 90
const TOP_LINKS_LIMIT = 10

type MysqlPool = ReturnType<typeof useMysqlPool>

export async function wikilinksTableExists(pool: MysqlPool): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'post_wikilinks' LIMIT 1`,
  )
  return Array.isArray(rows) && rows.length > 0
}

function emptyByResolve(): Record<WikilinkResolveStatus, number> {
  return { ok: 0, missing_target: 0, ambiguous: 0, self_loop: 0 }
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildTrendSeries(
  rows: { day: string; count: number }[],
  days: number,
): DashboardPostTrendPoint[] {
  const countByDay = new Map<string, number>()
  for (const row of rows) {
    const key =
      row.day instanceof Date
        ? formatDateKey(row.day)
        : String(row.day).slice(0, 10)
    countByDay.set(key, Number(row.count) || 0)
  }

  const result: DashboardPostTrendPoint[] = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = formatDateKey(d)
    result.push({ date: key, count: countByDay.get(key) ?? 0 })
  }
  return result
}

export async function fetchDashboardStats(pool: MysqlPool): Promise<DashboardData> {
  const by_status = { draft: 0, published: 0, archived: 0 }

  const [statusRows] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM posts GROUP BY status`,
  )
  for (const row of statusRows as { status: keyof typeof by_status; count: number }[]) {
    if (row.status in by_status) {
      by_status[row.status] = Number(row.count) || 0
    }
  }
  const total = by_status.draft + by_status.published + by_status.archived

  const [trendRows] = await pool.query(
    `SELECT DATE(COALESCE(published_at, created_at)) AS day, COUNT(*) AS count
     FROM posts
     WHERE COALESCE(published_at, created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY day
     ORDER BY day ASC`,
    [TREND_DAYS],
  )
  const trend = buildTrendSeries(
    (trendRows as { day: string | Date; count: number }[]).map((r) => ({
      day: r.day instanceof Date ? formatDateKey(r.day) : String(r.day),
      count: Number(r.count) || 0,
    })),
    TREND_DAYS,
  )

  const [recentRows] = await pool.query(
    `SELECT slug, title, updated_at FROM posts ORDER BY updated_at DESC LIMIT 5`,
  )
  const recent_updated: DashboardRecentPost[] = (recentRows as {
    slug: string
    title: string
    updated_at: string | Date
  }[]).map((r) => ({
    slug: r.slug,
    title: r.title,
    updated_at:
      r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }))

  const [dirRows] = await pool.query('SELECT COUNT(*) AS count FROM directories')
  const dirCount = Number((dirRows as { count: number }[])[0]?.count ?? 0)

  const wikilinks = {
    edges_ok: 0,
    by_resolve: emptyByResolve(),
    by_kind: { link: 0, embed: 0 },
    orphan_count: 0,
    avg_in_degree: 0,
    top_inbound: [] as DashboardTopLink[],
    top_outbound: [] as DashboardTopLink[],
  }

  if (await wikilinksTableExists(pool)) {
    const [resolveRows] = await pool.query(
      `SELECT resolve_status, COUNT(*) AS count FROM post_wikilinks GROUP BY resolve_status`,
    )
    for (const row of resolveRows as {
      resolve_status: WikilinkResolveStatus
      count: number
    }[]) {
      if (RESOLVE_STATUSES.includes(row.resolve_status)) {
        wikilinks.by_resolve[row.resolve_status] = Number(row.count) || 0
      }
    }
    wikilinks.edges_ok = wikilinks.by_resolve.ok

    const [kindRows] = await pool.query(
      `SELECT link_kind, COUNT(*) AS count FROM post_wikilinks GROUP BY link_kind`,
    )
    for (const row of kindRows as { link_kind: 'link' | 'embed'; count: number }[]) {
      if (row.link_kind === 'link' || row.link_kind === 'embed') {
        wikilinks.by_kind[row.link_kind] = Number(row.count) || 0
      }
    }

    const [postIdRows] = await pool.query('SELECT id FROM posts')
    const postIds = new Set((postIdRows as { id: number }[]).map((r) => r.id))

    const connected = new Set<number>()
    const inDegree = new Map<number, number>()

    const [okEdgeRows] = await pool.query(
      `SELECT source_post_id, target_post_id
       FROM post_wikilinks
       WHERE resolve_status = 'ok' AND target_post_id IS NOT NULL`,
    )
    const edgeKeys = new Set<string>()
    for (const row of okEdgeRows as { source_post_id: number; target_post_id: number }[]) {
      const key = `${row.source_post_id}\t${row.target_post_id}`
      if (edgeKeys.has(key)) continue
      edgeKeys.add(key)
      connected.add(row.source_post_id)
      connected.add(row.target_post_id)
      const t = row.target_post_id
      inDegree.set(t, (inDegree.get(t) ?? 0) + 1)
    }

    let orphanCount = 0
    for (const id of postIds) {
      if (!connected.has(id)) orphanCount++
    }
    wikilinks.orphan_count = orphanCount

    if (postIds.size > 0) {
      const inSum = [...inDegree.values()].reduce((a, b) => a + b, 0)
      wikilinks.avg_in_degree =
        Math.round((inSum / postIds.size) * 100) / 100
    }

    const [inboundRows] = await pool.query(
      `SELECT p.slug, p.title, COUNT(*) AS count
       FROM post_wikilinks w
       INNER JOIN posts p ON p.id = w.target_post_id
       WHERE w.resolve_status = 'ok' AND w.target_post_id IS NOT NULL
       GROUP BY w.target_post_id, p.slug, p.title
       ORDER BY count DESC
       LIMIT ?`,
      [TOP_LINKS_LIMIT],
    )
    wikilinks.top_inbound = (inboundRows as {
      slug: string
      title: string
      count: number
    }[]).map((r) => ({
      slug: r.slug,
      title: r.title,
      count: Number(r.count) || 0,
    }))

    const [outboundRows] = await pool.query(
      `SELECT p.slug, p.title, COUNT(*) AS count
       FROM post_wikilinks w
       INNER JOIN posts p ON p.id = w.source_post_id
       WHERE w.resolve_status = 'ok' AND w.target_post_id IS NOT NULL
       GROUP BY w.source_post_id, p.slug, p.title
       ORDER BY count DESC
       LIMIT ?`,
      [TOP_LINKS_LIMIT],
    )
    wikilinks.top_outbound = (outboundRows as {
      slug: string
      title: string
      count: number
    }[]).map((r) => ({
      slug: r.slug,
      title: r.title,
      count: Number(r.count) || 0,
    }))
  }

  return {
    posts: { total, by_status, trend, recent_updated },
    directories: { total: dirCount },
    wikilinks,
  }
}
