import { POST_EDIT_SAVE_STASH_KEY } from '~/constants/post-compose'

export type PostEditSaveStash = {
  originalSlug: string
  body: string
  title: string
  directory_id: number
  status: 'draft' | 'published' | 'archived'
  wikilink_slugs: string[]
  stashedAt: number
}

export function usePostEditSaveStash() {
  function stashEditSave(payload: Omit<PostEditSaveStash, 'stashedAt'>) {
    if (!import.meta.client) return
    const data: PostEditSaveStash = { ...payload, stashedAt: Date.now() }
    sessionStorage.setItem(POST_EDIT_SAVE_STASH_KEY, JSON.stringify(data))
  }

  function consumeEditSave(): PostEditSaveStash | null {
    if (!import.meta.client) return null
    const raw = sessionStorage.getItem(POST_EDIT_SAVE_STASH_KEY)
    if (!raw) return null
    sessionStorage.removeItem(POST_EDIT_SAVE_STASH_KEY)
    try {
      return JSON.parse(raw) as PostEditSaveStash
    } catch {
      return null
    }
  }

  function peekEditSave(): PostEditSaveStash | null {
    if (!import.meta.client) return null
    const raw = sessionStorage.getItem(POST_EDIT_SAVE_STASH_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as PostEditSaveStash
    } catch {
      return null
    }
  }

  function clearEditSaveStash() {
    if (!import.meta.client) return
    sessionStorage.removeItem(POST_EDIT_SAVE_STASH_KEY)
  }

  return { stashEditSave, consumeEditSave, peekEditSave, clearEditSaveStash }
}
