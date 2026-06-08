export type WikilinkResolveStatus =
  | 'ok'
  | 'missing_target'
  | 'ambiguous'
  | 'self_loop'

export type DashboardPostTrendPoint = {
  date: string
  count: number
}

export type DashboardRecentPost = {
  slug: string
  title: string
  updated_at: string
}

export type DashboardTopLink = {
  slug: string
  title: string
  count: number
}

export type DashboardData = {
  posts: {
    total: number
    by_status: {
      draft: number
      published: number
      archived: number
    }
    trend: DashboardPostTrendPoint[]
    recent_updated: DashboardRecentPost[]
  }
  directories: {
    total: number
  }
  wikilinks: {
    edges_ok: number
    by_resolve: Record<WikilinkResolveStatus, number>
    by_kind: { link: number; embed: number }
    orphan_count: number
    avg_in_degree: number
    top_inbound: DashboardTopLink[]
    top_outbound: DashboardTopLink[]
  }
}
