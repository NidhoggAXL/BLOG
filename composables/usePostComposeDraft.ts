import { POST_COMPOSE_DRAFT_KEY, POST_COMPOSE_IMPORT_KEY, POST_CREATE_SAVE_STASH_KEY } from '~/constants/post-compose'

export type PostComposeImportPayload = {
  title: string
  body: string
  slug: string
}

export type PostCreateSaveStash = {
  body: string
  title: string
  slug: string
  directory_id: number
  status: 'draft' | 'published' | 'archived'
  wikilink_slugs: string[]
  stashedAt: number
}

export function usePostComposeDraft() {
  function readDraftBody(): string {
    if (!import.meta.client) return ''
    try {
      const raw = sessionStorage.getItem(POST_COMPOSE_DRAFT_KEY)
      if (!raw) return ''
      const data = JSON.parse(raw) as { body?: string }
      return typeof data.body === 'string' ? data.body : ''
    } catch {
      return ''
    }
  }

  function writeDraftBody(body: string) {
    if (!import.meta.client) return
    if (!body.trim()) {
      sessionStorage.removeItem(POST_COMPOSE_DRAFT_KEY)
      return
    }
    sessionStorage.setItem(
      POST_COMPOSE_DRAFT_KEY,
      JSON.stringify({ body, updatedAt: Date.now() }),
    )
  }

  function clearDraft() {
    if (!import.meta.client) return
    sessionStorage.removeItem(POST_COMPOSE_DRAFT_KEY)
  }

  function consumeImport(): PostComposeImportPayload | null {
    if (!import.meta.client) return null
    const raw = sessionStorage.getItem(POST_COMPOSE_IMPORT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(POST_COMPOSE_IMPORT_KEY)
    try {
      return JSON.parse(raw) as PostComposeImportPayload
    } catch {
      return null
    }
  }

  function stashImport(payload: PostComposeImportPayload) {
    if (!import.meta.client) return
    sessionStorage.setItem(POST_COMPOSE_IMPORT_KEY, JSON.stringify(payload))
  }

  function stashCreateSave(payload: Omit<PostCreateSaveStash, 'stashedAt'>) {
    if (!import.meta.client) return
    const data: PostCreateSaveStash = { ...payload, stashedAt: Date.now() }
    sessionStorage.setItem(POST_CREATE_SAVE_STASH_KEY, JSON.stringify(data))
  }

  function consumeCreateSave(): PostCreateSaveStash | null {
    if (!import.meta.client) return null
    const raw = sessionStorage.getItem(POST_CREATE_SAVE_STASH_KEY)
    if (!raw) return null
    sessionStorage.removeItem(POST_CREATE_SAVE_STASH_KEY)
    try {
      return JSON.parse(raw) as PostCreateSaveStash
    } catch {
      return null
    }
  }

  function peekCreateSave(): PostCreateSaveStash | null {
    if (!import.meta.client) return null
    const raw = sessionStorage.getItem(POST_CREATE_SAVE_STASH_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as PostCreateSaveStash
    } catch {
      return null
    }
  }

  function clearCreateSaveStash() {
    if (!import.meta.client) return
    sessionStorage.removeItem(POST_CREATE_SAVE_STASH_KEY)
  }

  return {
    readDraftBody,
    writeDraftBody,
    clearDraft,
    consumeImport,
    stashImport,
    stashCreateSave,
    consumeCreateSave,
    peekCreateSave,
    clearCreateSaveStash,
  }
}
