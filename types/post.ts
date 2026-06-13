/** posts 列表接口返回的字段 */
export interface PostListItem {
  id: number
  directory_id: number | null
  sort_order: number | null
  slug: string
  title: string
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
}

export type PostWikilinkRef = {
  slug: string
  title: string
}

/** posts 详情 */
export interface PostDetail extends PostListItem {
  body: string
  /** 服务端预渲染的正文 HTML（双链、嵌入、代码高亮） */
  body_html?: string
  published_at: string | null
  created_at: string
  /** 编辑页回显：边表中已解析成功的出链目标 slug */
  wikilink_target_slugs?: string[]
  /** 指向本文的已发布文章（入链） */
  inbound_links?: PostWikilinkRef[]
  /** 本文指向的已发布文章（出链） */
  outbound_links?: PostWikilinkRef[]
}

export type PostDeleteBacklink = {
  source_slug: string
  source_title: string
  link_kind: 'link' | 'embed'
  raw_target: string
}

export type PostDeleteImpact = {
  post_id: number
  slug: string
  title: string
  outbound_links: number
  inbound_links: number
  backlinks: PostDeleteBacklink[]
}

export type PostDeleteResult = {
  deleted: boolean
  slug: string
  title: string
  outbound_links_removed: number
  inbound_links_affected: number
  inbound_marked_missing: number
  backlinks_affected: PostDeleteBacklink[]
}

export type PostBatchDeleteImpactPost = {
  post_id: number
  slug: string
  title: string
  outbound_links: number
  inbound_links: number
}

export type PostBatchDeleteImpact = {
  mode: 'selection' | 'directory'
  directory_label: string | null
  posts: PostBatchDeleteImpactPost[]
  total_posts: number
  total_outbound: number
  total_inbound: number
  backlinks: PostDeleteBacklink[]
}

export type PostBatchDeleteResult = {
  deleted_count: number
  deleted_slugs: string[]
  total_outbound_removed: number
  total_inbound_marked_missing: number
}

export type PostBatchStatusResult = {
  updated_count: number
  updated_slugs: string[]
  status: 'draft' | 'published' | 'archived'
}

export type PostUpdateResult = PostDetail & {
  wikilink_target_slugs?: string[]
  wikilink_edges_synced?: number
  slug_changed?: boolean
  previous_slug?: string
  warnings?: string[]
}
