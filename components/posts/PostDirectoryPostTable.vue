<script setup lang="ts">
import { Delete, Edit } from '@element-plus/icons-vue'
import type { TableInstance } from 'element-plus'
import PostDeleteDialog from '~/components/posts/PostDeleteDialog.vue'
import type { PostDeleteResult, PostListItem } from '~/types/post'
import { formatDateZh } from '~/utils/formatDateZh'
import type { PostListRow } from '~/utils/postSearch'

defineOptions({ name: 'PostDirectoryPostTable' })

/** 各列统一最小宽度，整体宽度相近 */
const COL_MIN_WIDTH = 140

const props = withDefaults(
  defineProps<{
    posts: PostListRow[]
    showDirectoryColumn?: boolean
    emptyText?: string
  }>(),
  {
    showDirectoryColumn: false,
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
const tableHeight = ref(280)

let resizeObserver: ResizeObserver | null = null

function updateTableHeight() {
  const el = wrapRef.value
  if (!el) return
  tableHeight.value = Math.max(120, Math.floor(el.clientHeight))
}

onMounted(() => {
  updateTableHeight()
  resizeObserver = new ResizeObserver(() => updateTableHeight())
  if (wrapRef.value) resizeObserver.observe(wrapRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

const rows = computed(() =>
  [...props.posts].sort((a, b) => {
    const ta = a.created_at ?? a.updated_at ?? ''
    const tb = b.created_at ?? b.updated_at ?? ''
    return tb.localeCompare(ta)
  }),
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
  <div ref="wrapRef" class="admin-data-table-wrap">
    <el-table
      ref="tableRef"
      :data="rows"
      :height="tableHeight"
      class="admin-data-table admin-data-table--clickable"
      stripe
      table-layout="auto"
      row-key="id"
      :empty-text="emptyText"
      @row-click="(row: PostListItem, column: { type?: string }) => onRowClick(row, column)"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="44" align="center" :reserve-selection="false" />
      <el-table-column
        v-if="showDirectoryColumn"
        prop="directory_path"
        label="目录"
        :min-width="COL_MIN_WIDTH"
        align="left"
        header-align="left"
        class-name="admin-data-table__col-left"
        label-class-name="admin-data-table__col-left"
      >
        <template #default="{ row }">
          <span class="admin-data-table__muted">{{ row.directory_path ?? '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="title"
        label="标题"
        :min-width="COL_MIN_WIDTH"
        align="left"
        header-align="left"
        class-name="admin-data-table__col-left admin-data-table__col-left--indent"
        label-class-name="admin-data-table__col-left admin-data-table__col-left--indent"
      >
        <template #default="{ row }">
          <span class="admin-data-table__title">{{ row.title }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="slug"
        label="slug"
        :min-width="COL_MIN_WIDTH"
        align="center"
        header-align="center"
      >
        <template #default="{ row }">
          <code class="admin-data-table__slug">{{ row.slug }}</code>
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        label="状态"
        :min-width="COL_MIN_WIDTH"
        align="center"
        header-align="center"
      >
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.status)" effect="plain">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        :min-width="COL_MIN_WIDTH"
        align="center"
        header-align="center"
      >
        <template #default="{ row }">
          <span class="admin-data-table__muted">{{ formatDateZh(row.created_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        :min-width="COL_MIN_WIDTH"
        align="center"
        header-align="center"
      >
        <template #default="{ row }">
          <span class="admin-data-table__muted">{{ formatDateZh(row.updated_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center" header-align="center" fixed="right">
        <template #default="{ row }">
          <div class="admin-data-table__actions">
            <el-button type="primary" link :icon="Edit" @click="openEdit(row, $event)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="openDelete(row, $event)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <PostDeleteDialog
    v-if="deleteSlug"
    :model-value="!!deleteSlug"
    :slug="deleteSlug"
    @update:model-value="(v: boolean) => { if (!v) deleteSlug = null }"
    @deleted="onDeleted"
  />
</template>
