import type { ImportMdFile } from '~/composables/parseImportArchive'

export type PostBatchImportStash = {
  sourceName: string
  files: ImportMdFile[]
  stashedAt: number
}

const batchImportStash = ref<PostBatchImportStash | null>(null)

/** 批量 zip 导入暂存（内存，SPA 内跳转；刷新后需重新选择文件） */
export function usePostBatchImportStash() {
  function stashBatchImport(payload: Omit<PostBatchImportStash, 'stashedAt'>) {
    batchImportStash.value = {
      ...payload,
      stashedAt: Date.now(),
    }
  }

  function consumeBatchImport(): PostBatchImportStash | null {
    const data = batchImportStash.value
    batchImportStash.value = null
    return data
  }

  function peekBatchImport(): PostBatchImportStash | null {
    return batchImportStash.value
  }

  function clearBatchImportStash() {
    batchImportStash.value = null
  }

  return {
    stashBatchImport,
    consumeBatchImport,
    peekBatchImport,
    clearBatchImportStash,
  }
}
