<script setup lang="ts">
import { Delete, Edit } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import PostDeleteDialog from '~/components/posts/PostDeleteDialog.vue'
import type { PostDeleteResult, PostListItem } from '~/types/post'
import { formatDateZh } from '~/utils/formatDateZh'
import type { PostListRow } from '~/utils/postSearch'

defineOptions({ name: 'PostDirectoryPostTable' })

const props = withDefaults(
  defineProps<{
    posts: PostListRow[]
    showDirectoryColumn?: boolean
    cardView?: boolean
    emptyText?: string
  }>(),
  {
    showDirectoryColumn: false,
    cardView: false,
    emptyText: '该目录下暂无文章',
  },
)

const selectedRows = defineModel<PostListItem[]>('selected', { default: () => [] })

const emit = defineEmits<{
  changed: []
}>()

const router = useRouter()
const deleteSlug = ref<string | null>(null)
const tableRef = ref<TableInstance | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
/** 仅客户端测量后赋值，避免 SSR 默认高度与客户端 hydration 不一致 */
const tableHeight = ref<number | undefined>(undefined)

let resizeObserver: ResizeObserver | null = null
let resizeRaf = 0

function updateTableHeight() {
  const el = wrapRef.value
  if (!el) return
  const next = Math.max(120, Math.floor(el.getBoundingClientRect().height))
  if (next <= 0) return
  if (tableHeight.value !== next) {
    tableHeight.value = next
    nextTick(() => tableRef.value?.doLayout?.())
  }
}

function scheduleTableHeightUpdate() {
  if (!import.meta.client) return
  cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    updateTableHeight()
  })
}

onMounted(async () => {
  await nextTick()
  updateTableHeight()
  resizeObserver = new ResizeObserver(() => scheduleTableHeightUpdate())
  if (wrapRef.value) resizeObserver.observe(wrapRef.value)
  if (wrapRef.value?.parentElement) {
    resizeObserver.observe(wrapRef.value.parentElement)
  }
  window.addEventListener('resize', scheduleTableHeightUpdate)
})

onUnmounted(() => {
  cancelAnimationFrame(resizeRaf)
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', scheduleTableHeightUpdate)
})

const rows = computed(() =>
  [...props.posts].sort((a, b) => {
    const ta = a.created_at ?? a.updated_at ?? ''
    const tb = b.created_at ?? b.updated_at ?? ''
    return tb.localeCompare(ta)
  }),
)

const tableClass = computed(() => [
  'admin-data-table',
  'admin-data-table--clickable',
  'admin-data-table--comfortable',
  'admin-data-table--posts',
])

/** 列宽：固定列定宽，标题/Slug/目录用相同 min-width 均分剩余空间 */
const colLayout = computed(() => {
  const hasDirCol = props.showDirectoryColumn
  const flexMin = hasDirCol ? 128 : 140

  return {
    selectionWidth: 46,
    directoryMinWidth: flexMin,
    titleMinWidth: flexMin,
    slugMinWidth: flexMin,
    statusWidth: 84,
    /** 容纳「2026年12月31日」 */
    dateWidth: 120,
    /** 编辑 + 删除 两个带图标链接按钮 */
    actionWidth: 152,
  }
})

watch(
  () => [props.posts.length, props.showDirectoryColumn] as const,
  async () => {
    await nextTick()
    scheduleTableHeightUpdate()
    tableRef.value?.doLayout?.()
  },
)

function statusLabel(status: PostListItem['status']) {
  if (status === 'published') return '已发布'
  if (status === 'archived') return '已归档'
  return '草稿'
}

function statusTagType(status: PostListItem['status']) {
  if (status === 'published') return 'success'
  if (status === 'archived') return 'info'
  return 'warning'
}

function onRowClick(row: PostListItem, column: { type?: string }) {
  if (column?.type === 'selection') return
  router.push(`/admin/posts/${encodeURIComponent(row.slug)}`)
}

function openDetail(row: PostListItem) {
  router.push(`/admin/posts/${encodeURIComponent(row.slug)}`)
}

function openEdit(row: PostListItem, ev: Event) {
  ev.stopPropagation()
  router.push(`/admin/posts/edit/${encodeURIComponent(row.slug)}`)
}

function openDelete(row: PostListItem, ev: Event) {
  ev.stopPropagation()
  deleteSlug.value = row.slug
}

function onDeleted(_res: PostDeleteResult) {
  deleteSlug.value = null
  emit('changed')
}

function onSelectionChange(rows: PostListItem[]) {
  selectedRows.value = rows
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selectedRows.value = []
}

defineExpose({ clearSelection })
</script>

<template>
  <div
    v-if="cardView"
    ref="wrapRef"
    class="posts-card-list"
  >
    <p v-if="!rows.length" class="posts-card-list__empty">{{ emptyText }}</p>
    <article
      v-for="row in rows"
      :key="row.id"
      class="posts-card-list__item"
      @click="openDetail(row)"
    >
      <div class="posts-card-list__main">
        <h3 class="posts-card-list__title">{{ row.title }}</h3>
        <p class="posts-card-list__slug">{{ row.slug }}</p>
        <p v-if="showDirectoryColumn && row.directory_path" class="posts-card-list__path">
          {{ row.directory_path }}
        </p>
      </div>
      <div class="posts-card-list__meta">
        <el-tag size="small" :type="statusTagType(row.status)" effect="plain">
          {{ statusLabel(row.status) }}
        </el-tag>
        <span class="admin-data-table__muted">创建 {{ formatDateZh(row.created_at) }}</span>
        <span class="admin-data-table__muted">更新 {{ formatDateZh(row.updated_at) }}</span>
      </div>
      <div class="posts-card-list__actions" @click.stop>
        <el-button type="primary" link :icon="Edit" @click="openEdit(row, $event)">编辑</el-button>
        <el-button type="danger" link :icon="Delete" @click="openDelete(row, $event)">删除</el-button>
      </div>
    </article>
  </div>

  <div v-else ref="wrapRef" class="admin-data-table-wrap admin-data-table-wrap--fill">
    <ClientOnly>
      <el-table
        v-if="tableHeight != null"
        ref="tableRef"
        :data="rows"
        :height="tableHeight"
        :class="tableClass"
        stripe
        table-layout="fixed"
        row-key="id"
        :empty-text="emptyText"
        @row-click="(row: PostListItem, column: { type?: string }) => onRowClick(row, column)"
        @selection-change="onSelectionChange"
      >
      <el-table-column
        type="selection"
        :width="colLayout.selectionWidth"
        align="center"
        header-align="center"
        :reserve-selection="false"
      />
      <el-table-column
        v-if="showDirectoryColumn"
        prop="directory_path"
        label="目录"
        :min-width="colLayout.directoryMinWidth"
        align="center"
        header-align="center"
        class-name="admin-data-table__col-center admin-data-table__col-path"
        label-class-name="admin-data-table__col-center admin-data-table__col-path"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="admin-data-table__path">{{ row.directory_path ?? '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        :min-width="colLayout.titleMinWidth"
        align="center"
        header-align="center"
        class-name="admin-data-table__col-center admin-data-table__col-title"
        label-class-name="admin-data-table__col-center admin-data-table__col-title"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="admin-data-table__title">{{ row.title }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="slug"
        label="Slug"
        :min-width="colLayout.slugMinWidth"
        align="center"
        header-align="center"
        class-name="admin-data-table__col-center admin-data-table__col-slug"
        label-class-name="admin-data-table__col-center admin-data-table__col-slug"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="admin-data-table__slug">{{ row.slug }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        label="状态"
        :width="colLayout.statusWidth"
        align="center"
        header-align="center"
        class-name="admin-data-table__col-center"
        label-class-name="admin-data-table__col-center"
      >
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)" effect="plain">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        :width="colLayout.dateWidth"
        align="center"
        header-align="center"
        class-name="admin-data-table__col-center admin-data-table__col-date"
        label-class-name="admin-data-table__col-center admin-data-table__col-date"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="admin-data-table__date">{{ formatDateZh(row.created_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        :width="colLayout.dateWidth"
        align="center"
        header-align="center"
        class-name="admin-data-table__col-center admin-data-table__col-date"
        label-class-name="admin-data-table__col-center admin-data-table__col-date"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="admin-data-table__date">{{ formatDateZh(row.updated_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        :width="colLayout.actionWidth"
        :min-width="colLayout.actionWidth"
        fixed="right"
        align="center"
        header-align="center"
        class-name="admin-data-table__col-center admin-data-table__col-actions"
        label-class-name="admin-data-table__col-center admin-data-table__col-actions"
      >
        <template #default="{ row }">
          <div class="admin-data-table__actions">
            <el-button type="primary" link :icon="Edit" @click="openEdit(row, $event)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="openDelete(row, $event)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
      <template #fallback>
        <div class="admin-data-table-wrap__placeholder" aria-hidden="true" />
      </template>
    </ClientOnly>
  </div>

  <PostDeleteDialog
    v-if="deleteSlug"
    :model-value="!!deleteSlug"
    :slug="deleteSlug"
    @update:model-value="(v: boolean) => { if (!v) deleteSlug = null }"
    @deleted="onDeleted"
  />
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.posts-card-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.posts-card-list__empty {
  margin: 0;
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--admin-muted);
}

.posts-card-list__item {
  padding: 12px 14px;
  border: 1px solid var(--admin-border);
  border-radius: @radius-lg;
  background: var(--admin-card-bg);
  cursor: pointer;
  transition: background @transition-fast;

  &:hover {
    background: var(--admin-nav-hover);
  }
}

.posts-card-list__main {
  min-width: 0;
  margin-bottom: 8px;
}

.posts-card-list__title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--admin-text);
  line-height: 1.4;
}

.posts-card-list__slug {
  margin: 0 0 4px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--admin-muted);
  word-break: break-all;
}

.posts-card-list__path {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--admin-muted);
}

.posts-card-list__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 8px;
}

.posts-card-list__actions {
  display: flex;
  gap: 4px;
}

.admin-data-table-wrap__placeholder {
  flex: 1;
  min-height: 120px;
}
</style>
