import type { Pool, PoolConnection } from 'mysql2/promise'
import type { PostDeleteBacklink, PostListItem } from '../../types/post'
import { fetchPostBySlug } from './post-mutate'
import { countWikilinkEdges, getInboundWikilinks, markInboundWikilinksMissing } from './wikilinks'

export const UNCATEGORIZED_DIRECTORY_ID = -1

export type BatchDeleteImpactPost = {
  post_id: number
  slug: string
  title: string
  outbound_links: number
  inbound_links: number
}

export type BatchDeleteImpact = {
  mode: 'selection' | 'directory'
  directory_label: string | null
  posts: BatchDeleteImpactPost[]
  total_posts: number
  total_outbound: number
  total_inbound: number
  backlinks: PostDeleteBacklink[]
}

export type BatchDeleteResult = {
  deleted_count: number
  deleted_slugs: string[]
  total_outbound_removed: number
  total_inbound_marked_missing: number
}

export async function fetchPostsByDirectory(
  conn: PoolConnection,
  directoryId: number,
): Promise<Pick<PostListItem, 'id' | 'slug' | 'title'>[]> {
  if (directoryId === UNCATEGORIZED_DIRECTORY_ID) {
    const [rows] = await conn.query(
      'SELECT id, slug, title FROM posts WHERE directory_id IS NULL ORDER BY title ASC',
    )
    return rows as Pick<PostListItem, 'id' | 'slug' | 'title'>[]
  }
  const [rows] = await conn.query(
    'SELECT id, slug, title FROM posts WHERE directory_id = ? ORDER BY title ASC',
    [directoryId],
  )
  return rows as Pick<PostListItem, 'id' | 'slug' | 'title'>[]
}

export async function resolvePostsBySlugs(
  conn: PoolConnection,
  slugs: string[],
): Promise<Pick<PostListItem, 'id' | 'slug' | 'title'>[]> {
  const out: Pick<PostListItem, 'id' | 'slug' | 'title'>[] = []
  const seen = new Set<number>()
  for (const raw of slugs) {
    const slug = raw.trim()
    if (!slug) continue
    const post = await fetchPostBySlug(conn, slug)
    if (!post || seen.has(post.id)) continue
    seen.add(post.id)
    out.push({ id: post.id, slug: post.slug, title: post.title })
  }
  return out
}

async function buildImpactForPosts(
  conn: PoolConnection,
  posts: Pick<PostListItem, 'id' | 'slug' | 'title'>[],
  mode: 'selection' | 'directory',
  directoryLabel: string | null,
): Promise<BatchDeleteImpact> {
  const impactPosts: BatchDeleteImpactPost[] = []
  const backlinkMap = new Map<string, PostDeleteBacklink>()
  let totalOutbound = 0
  let totalInbound = 0

  for (const post of posts) {
    const counts = await countEdges(conn, post.id)
    const backlinks = await getInboundWikilinks(conn, post.id)
    totalOutbound += counts.outbound
    totalInbound += counts.inbound
    impactPosts.push({
      post_id: post.id,
      slug: post.slug,
      title: post.title,
      outbound_links: counts.outbound,
      inbound_links: counts.inbound,
    })
    for (const b of backlinks) {
      const key = `${b.source_slug}:${b.raw_target}`
      if (!backlinkMap.has(key)) {
        backlinkMap.set(key, {
          source_slug: b.source_slug,
          source_title: b.source_title,
          link_kind: b.link_kind,
          raw_target: b.raw_target,
        })
      }
    }
  }

  return {
    mode,
    directory_label: directoryLabel,
    posts: impactPosts,
    total_posts: impactPosts.length,
    total_outbound: totalOutbound,
    total_inbound: totalInbound,
    backlinks: [...backlinkMap.values()],
  }
}

async function countEdges(
  conn: PoolConnection,
  postId: number,
): Promise<{ outbound: number; inbound: number }> {
  return countWikilinkEdges(conn, postId)
}

export async function getBatchDeleteImpact(
  pool: Pool,
  input: { slugs?: string[]; directory_id?: number; directory_label?: string },
): Promise<BatchDeleteImpact> {
  const conn = await pool.getConnection()
  try {
    if (input.directory_id != null) {
      const posts = await fetchPostsByDirectory(conn, input.directory_id)
      return buildImpactForPosts(
        conn,
        posts,
        'directory',
        input.directory_label ?? null,
      )
    }
    const slugs = input.slugs ?? []
    if (!slugs.length) {
      return buildImpactForPosts(conn, [], 'selection', null)
    }
    const posts = await resolvePostsBySlugs(conn, slugs)
    return buildImpactForPosts(conn, posts, 'selection', null)
  } finally {
    conn.release()
  }
}

export async function batchDeletePosts(
  pool: Pool,
  input: { slugs?: string[]; directory_id?: number },
): Promise<BatchDeleteResult> {
  const conn = await pool.getConnection()
  try {
    let posts: Pick<PostListItem, 'id' | 'slug' | 'title'>[]
    if (input.directory_id != null) {
      posts = await fetchPostsByDirectory(conn, input.directory_id)
    } else {
      posts = await resolvePostsBySlugs(conn, input.slugs ?? [])
    }

    if (!posts.length) {
      return {
        deleted_count: 0,
        deleted_slugs: [],
        total_outbound_removed: 0,
        total_inbound_marked_missing: 0,
      }
    }

    await conn.beginTransaction()
    let totalOutbound = 0
    let totalInboundMarked = 0
    const deletedSlugs: string[] = []

    for (const post of posts) {
      const counts = await countEdges(conn, post.id)
      totalOutbound += counts.outbound
      const marked = await markInboundWikilinksMissing(conn, post.id)
      totalInboundMarked += marked
      await conn.query('DELETE FROM posts WHERE id = ?', [post.id])
      deletedSlugs.push(post.slug)
    }

    await conn.commit()

    return {
      deleted_count: deletedSlugs.length,
      deleted_slugs: deletedSlugs,
      total_outbound_removed: totalOutbound,
      total_inbound_marked_missing: totalInboundMarked,
    }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
