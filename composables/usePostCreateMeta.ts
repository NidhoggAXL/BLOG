import { buildDirectoryTreeSelectData, type DirectoryTreeNode } from '~/composables/buildDirectoryTreeSelect'
import { buildWikilinkLinkOptions } from '~/utils/buildWikilinkLinkOptions'
import type { DirectoryRow } from '~/types/directory'
import type { PostListItem } from '~/types/post'

/** 新建/批量导入共用的目录树与双链候选 */
export function usePostCreateMeta() {
  const flatDirs = ref<DirectoryRow[]>([])
  const postsForLinks = ref<PostListItem[]>([])
  const loading = ref(false)

  const directoryTreeOnly = computed<DirectoryTreeNode[]>(() =>
    buildDirectoryTreeSelectData(flatDirs.value),
  )

  const treeSelectData = computed<DirectoryTreeNode[]>(() => [
    { value: 0, label: '（未归类）', children: [] },
    ...directoryTreeOnly.value,
  ])

  const linkOptions = computed(() =>
    buildWikilinkLinkOptions(postsForLinks.value, flatDirs.value),
  )

  async function loadMeta() {
    loading.value = true
    try {
      const [dRes, pRes] = await Promise.all([
        $fetch<{ list: DirectoryRow[] }>('/api/directories/tree'),
        $fetch<{ list: PostListItem[] }>('/api/posts'),
      ])
      flatDirs.value = dRes.list
      postsForLinks.value = pRes.list
    } catch (e: unknown) {
      const err = e as { data?: { statusMessage?: string }; message?: string }
      ElMessage.error(err?.data?.statusMessage || err?.message || '加载目录或文章列表失败')
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    flatDirs,
    postsForLinks,
    loading,
    treeSelectData,
    directoryTreeOnly,
    linkOptions,
    loadMeta,
  }
}
