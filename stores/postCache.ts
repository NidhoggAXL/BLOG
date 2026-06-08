import { defineStore } from 'pinia'
import type { PostDetail, PostListItem } from '~/types/post'

/** 文章详情与列表内存缓存，减少重复请求 */
export const usePostCacheStore = defineStore('postCache', () => {
  const detailsBySlug = ref(new Map<string, PostDetail>())
  const list = ref<PostListItem[] | null>(null)
  const inflightDetail = ref(new Map<string, Promise<PostDetail>>())

  function getDetail(slug: string): PostDetail | undefined {
    return detailsBySlug.value.get(slug)
  }

  function setDetail(post: PostDetail) {
    const next = new Map(detailsBySlug.value)
    next.set(post.slug, post)
    detailsBySlug.value = next
  }

  function patchDetail(slug: string, patch: Partial<PostDetail>) {
    const cur = detailsBySlug.value.get(slug)
    if (!cur) return
    const next = new Map(detailsBySlug.value)
    const merged = { ...cur, ...patch }
    next.delete(slug)
    next.set(merged.slug, merged)
    detailsBySlug.value = next
  }

  function removeDetail(slug: string) {
    if (!detailsBySlug.value.has(slug)) return
    const next = new Map(detailsBySlug.value)
    next.delete(slug)
    detailsBySlug.value = next
  }

  function setList(items: PostListItem[]) {
    list.value = items
    const next = new Map(detailsBySlug.value)
    for (const item of items) {
      const cached = next.get(item.slug)
      if (cached && cached.id === item.id) {
        const body = (item as PostDetail).body ?? cached.body
        next.set(item.slug, { ...cached, ...item, body })
      }
    }
    detailsBySlug.value = next
  }

  function upsertListItem(item: PostListItem) {
    const items = list.value ? [...list.value] : []
    const idx = items.findIndex((p) => p.id === item.id || p.slug === item.slug)
    if (idx >= 0) items[idx] = item
    else items.push(item)
    setList(items)
  }

  async function fetchDetail(slug: string, opts?: { force?: boolean }): Promise<PostDetail> {
    const key = slug.trim()
    if (!key) throw new Error('缺少 slug')

    if (!opts?.force) {
      const cached = getDetail(key)
      if (cached?.body?.trim()) return cached
      const pending = inflightDetail.value.get(key)
      if (pending) return pending
    }

    const promise = $fetch<PostDetail>(`/api/posts/${encodeURIComponent(key)}`).then((post) => {
      setDetail(post)
      upsertListItem(post)
      return post
    })

    inflightDetail.value.set(key, promise)
    try {
      return await promise
    } finally {
      inflightDetail.value.delete(key)
    }
  }

  return {
    detailsBySlug,
    list,
    getDetail,
    setDetail,
    patchDetail,
    removeDetail,
    setList,
    upsertListItem,
    fetchDetail,
  }
})
